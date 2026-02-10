import { API_CONFIG } from "../config/api";
import { findArray, findStringUrl, normalizeEpisode, normalizeSeries } from "./normalizers";

const CACHE_VERSION = "v2";
const inFlightRequests = new Map();

function ttlForPath(path) {
  if (path.includes("/detail")) return 60 * 60 * 24; // 24h
  if (path.includes("/allepisode")) return 60 * 5; // 5m (stream URL can expire quickly)
  if (path.includes("/search")) return 60 * 5; // 5m
  if (path.includes("/foryou") || path.includes("/latest") || path.includes("/trending")) {
    return 60 * 10; // 10m
  }
  return 60 * 10; // default 10m
}

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  });
  return search.toString();
}

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

function cacheKeyPath(path) {
  return `${CACHE_VERSION}:${normalizePath(path)}`;
}

async function readFromRemoteCache(path) {
  const gateway = API_CONFIG.cacheGatewayUrl?.trim();
  if (!gateway) return null;

  try {
    const url = new URL(gateway);
    url.searchParams.set("path", cacheKeyPath(path));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;
    const json = await response.json();
    if (!json?.hit) return null;
    return json.payload ?? null;
  } catch {
    return null;
  }
}

async function writeToRemoteCache(path, payload, status = 200, contentType = "application/json; charset=utf-8") {
  const gateway = API_CONFIG.cacheGatewayUrl?.trim();
  if (!gateway) return;
  if (!API_CONFIG.cacheWriteToken) return;

  try {
    await fetch(gateway, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_CONFIG.cacheWriteToken}`,
      },
      body: JSON.stringify({
        path: cacheKeyPath(path),
        ttl: ttlForPath(path),
        status,
        contentType,
        payload,
      }),
    });
  } catch {
    // Ignore cache write failure.
  }
}

async function tryPaths(paths) {
  let lastError;
  for (const path of paths) {
    try {
      return await apiRequest(path);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Request gagal.");
}

export async function apiRequest(path, options = {}) {
  const { forceRefresh = false } = options;
  const normalizedPath = normalizePath(path);
  const requestKey = `${normalizedPath}|fresh:${forceRefresh ? "1" : "0"}`;
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey);
  }

  const requestPromise = (async () => {
    // 1) Always check KV cache first.
    if (!forceRefresh) {
      const cached = await readFromRemoteCache(normalizedPath);
      if (cached) return cached;
    }

    // 2) Cache miss: fetch directly to upstream API.
    const baseUrl = API_CONFIG.baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}${normalizedPath}`, {
      headers: {
        Accept: "application/json",
        ...(API_CONFIG.token
          ? {
              Authorization: `Bearer ${API_CONFIG.token}`,
              "x-api-key": API_CONFIG.token,
            }
          : {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Request gagal (${response.status} ${response.statusText})`;
      throw new Error(message);
    }

    // 3) Store fresh data to KV (best effort).
    await writeToRemoteCache(
      normalizedPath,
      payload,
      response.status,
      response.headers.get("content-type") || "application/json; charset=utf-8",
    );

    return payload;
  })();

  inFlightRequests.set(requestKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}

export async function fetchCatalog(kind, page = 1, extraParams = {}) {
  const endpointMap = {
    foryou: "foryou",
    new: "latest",
    rank: "trending",
  };
  const endpoint = endpointMap[kind] || kind;

  const params = toQuery({ ...extraParams, page });
  const payload = await tryPaths([
    `/${endpoint}${params ? `?${params}` : ""}`,
    `/${endpoint}/${page}`,
  ]);
  return findArray(payload).map(normalizeSeries).filter((item) => item.title);
}

export async function searchCatalog(query) {
  const payload = await tryPaths([
    `/search?query=${encodeURIComponent(query)}`,
    `/search?q=${encodeURIComponent(query)}`,
    `/search/${encodeURIComponent(query)}`,
  ]);
  return findArray(payload).map(normalizeSeries).filter((item) => item.title);
}

export async function fetchEpisodes(seriesId, options = {}) {
  const payload = await apiRequest(`/allepisode?bookId=${encodeURIComponent(seriesId)}`, options);
  return findArray(payload)
    .map(normalizeEpisode)
    .sort((a, b) => a.episode - b.episode);
}

export async function fetchSeriesDetail(seriesId) {
  const payload = await tryPaths([
    `/detail?bookId=${encodeURIComponent(seriesId)}`,
    `/detail/${encodeURIComponent(seriesId)}`,
  ]);

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.bookId || payload.bookName || payload.coverWap || payload.introduction) {
      return normalizeSeries(payload, 0);
    }

    const nested =
      payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data
        : payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
          ? payload.result
          : null;

    if (nested) return normalizeSeries(nested, 0);
  }

  const fromArray = findArray(payload);
  if (fromArray.length) return normalizeSeries(fromArray[0], 0);
  return normalizeSeries({}, 0);
}

export async function fetchStream(seriesId, episodeNumber, options = {}) {
  const episodes = await fetchEpisodes(seriesId, options);
  const target = episodes.find((item) => Number(item.episode) === Number(episodeNumber));
  const url = target?.streamUrl || findStringUrl(target);
  if (!url) throw new Error("Link stream tidak ditemukan pada respons API.");
  return url;
}
