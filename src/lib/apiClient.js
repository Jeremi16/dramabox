import { API_CONFIG } from "../config/api";
import {
  findArray,
  findStringUrl,
  normalizeEpisode,
  normalizeSeries,
} from "./normalizers";

const inFlightRequests = new Map();

// Source identifiers
const SOURCE_DRAMABOX = "dramabox";
const SOURCE_MELOLO = "melolo";

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
  const { forceRefresh = false, source = SOURCE_DRAMABOX } = options;
  const normalizedPath = normalizePath(path);
  const requestKey = `${source}|${normalizedPath}|fresh:${forceRefresh ? "1" : "0"}`;
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey);
  }

  const requestPromise = (async () => {
    const config = API_CONFIG[source] || API_CONFIG[SOURCE_DRAMABOX];
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}${normalizedPath}`, {
      headers: {
        Accept: "application/json",
        ...(config.token
          ? {
              Authorization: `Bearer ${config.token}`,
              "x-api-key": config.token,
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
  const { source = SOURCE_DRAMABOX, ...restParams } = extraParams;
  const endpointMap = {
    foryou: "api/recommend",
    new: "api/home",
    rank: "api/vip",
  };
  const endpoint = endpointMap[kind] || kind;

  const params = toQuery({ ...restParams, page });

  async function tryPathsWithSource(paths) {
    let lastError;
    for (const path of paths) {
      try {
        return await apiRequest(path, { source });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("Request gagal.");
  }

  const payload = await tryPathsWithSource([
    `/${endpoint}${params ? `?${params}` : ""}`,
    `/${endpoint}/${page}`,
  ]);
  return findArray(payload)
    .map((item) => normalizeSeries(item, 0, source))
    .filter((item) => item.title);
}

// Fetch catalog dari kedua sumber (DramaBox + Melolo)
export async function fetchCatalogCombined(kind, page = 1, extraParams = {}) {
  const [dramaboxResults, meloloResults] = await Promise.allSettled([
    fetchCatalog(kind, page, { ...extraParams, source: SOURCE_DRAMABOX }),
    fetchCatalog(kind, page, { ...extraParams, source: SOURCE_MELOLO }),
  ]);

  const results = [];

  if (dramaboxResults.status === "fulfilled") {
    results.push(...dramaboxResults.value);
  }

  if (meloloResults.status === "fulfilled") {
    results.push(...meloloResults.value);
  }

  return results;
}

export async function searchCatalog(query, source = SOURCE_DRAMABOX) {
  const payload = await apiRequest(
    `/api/search?keyword=${encodeURIComponent(query)}`,
    { source },
  );
  return findArray(payload)
    .map((item) => normalizeSeries(item, 0, source))
    .filter((item) => item.title);
}

// Search dari kedua sumber
export async function searchCatalogCombined(query) {
  const [dramaboxResults, meloloResults] = await Promise.allSettled([
    searchCatalog(query, SOURCE_DRAMABOX),
    searchCatalog(query, SOURCE_MELOLO),
  ]);

  const results = [];

  if (dramaboxResults.status === "fulfilled") {
    results.push(...dramaboxResults.value);
  }

  if (meloloResults.status === "fulfilled") {
    results.push(...meloloResults.value);
  }

  return results;
}

// Helper untuk mendeteksi source dari ID
function detectSourceFromId(id) {
  const idStr = String(id);
  if (idStr.startsWith("42")) return SOURCE_MELOLO;
  if (idStr.startsWith("41")) return SOURCE_DRAMABOX;
  // Default ke dramabox jika tidak dikenali
  return SOURCE_DRAMABOX;
}

export async function fetchEpisodes(seriesId, options = {}) {
  const source = detectSourceFromId(seriesId);
  const payload = await apiRequest(
    `/api/chapters/${encodeURIComponent(seriesId)}`,
    { ...options, source },
  );
  return findArray(payload)
    .map(normalizeEpisode)
    .sort((a, b) => a.episode - b.episode);
}

export async function fetchSeriesDetail(seriesId) {
  const source = detectSourceFromId(seriesId);
  try {
    // Try to get detail from API
    const payload = await apiRequest(
      `/api/detail/${encodeURIComponent(seriesId)}/v2`,
      { source },
    );

    // Check if we have data in payload.data
    if (payload && payload.data && typeof payload.data === "object") {
      // If data has bookId, use it directly
      if (payload.data.bookId || payload.data.bookName) {
        return normalizeSeries(payload.data, 0, source);
      }
    }

    // Check if payload itself has the data
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      if (
        payload.bookId ||
        payload.bookName ||
        payload.coverWap ||
        payload.introduction
      ) {
        return normalizeSeries(payload, 0, source);
      }
    }

    // Try to find in nested structures
    const nested =
      payload?.data &&
      typeof payload.data === "object" &&
      !Array.isArray(payload.data)
        ? payload.data
        : payload?.result &&
            typeof payload.result === "object" &&
            !Array.isArray(payload.result)
          ? payload.result
          : null;

    if (nested && (nested.bookId || nested.bookName)) {
      return normalizeSeries(nested, 0, source);
    }

    // Try to find in array
    const fromArray = findArray(payload);
    if (fromArray.length) return normalizeSeries(fromArray[0], 0, source);

    // If all fails, return empty but valid object
    console.warn("No detail found for seriesId:", seriesId);
    return normalizeSeries({ bookId: seriesId }, 0, source);
  } catch (error) {
    console.error("Error fetching series detail:", error);
    // Return minimal data so the page doesn't break
    return normalizeSeries({ bookId: seriesId }, 0, source);
  }
}

export async function fetchStream(seriesId, episodeNumber, options = {}) {
  const source = detectSourceFromId(seriesId);
  const payload = await apiRequest(
    `/api/stream?bookId=${encodeURIComponent(seriesId)}&chapter=${episodeNumber}`,
    { ...options, source },
  );
  const url = findStringUrl(payload);
  if (!url) throw new Error("Link stream tidak ditemukan pada respons API.");
  return url;
}
