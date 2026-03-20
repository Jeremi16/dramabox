import { API_CONFIG } from "../config/api";
import {
  parseDramaboxCatalogPayload,
  parseDramaboxEpisodesPayload,
  parseDramaboxSearchPayload,
  parseDramaboxSeriesDetailPayload,
  parseDramaboxStreamUrl,
} from "./providers/dramaboxParser";
import {
  parseMeloloCatalogPayload,
  parseMeloloEpisodesFromSeriesDetail,
  parseMeloloSearchPayload,
  parseMeloloSeriesDetailPayload,
  parseMeloloStreamUrl,
} from "./providers/meloloParser";

const SOURCE_DRAMABOX = "dramabox";
const SOURCE_MELOLO = "melolo";

const inFlightRequests = new Map();

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
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

function resolveSourceFromProvider(provider) {
  return provider === SOURCE_MELOLO ? SOURCE_MELOLO : SOURCE_DRAMABOX;
}

function detectSourceFromId(id) {
  const idStr = String(id || "");

  try {
    const sourceMap = JSON.parse(localStorage.getItem("seriesSourceMap") || "{}");
    if (sourceMap[idStr] === SOURCE_MELOLO) return SOURCE_MELOLO;
    if (sourceMap[idStr] === SOURCE_DRAMABOX) return SOURCE_DRAMABOX;
  } catch {
    // Ignore localStorage read errors.
  }

  // Heuristic fallback saat direct URL belum punya mapping di localStorage.
  if (/^76\d{10,}$/.test(idStr)) return SOURCE_MELOLO;
  return SOURCE_DRAMABOX;
}

function resolveSource(seriesId, provider) {
  if (provider === SOURCE_MELOLO || provider === SOURCE_DRAMABOX) {
    return provider;
  }
  return detectSourceFromId(seriesId);
}

function dedupeSeries(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    const key = `${item.source || "unknown"}:${item.id}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function persistSeriesCache(items = []) {
  if (!Array.isArray(items) || !items.length) return;
  try {
    const seriesCache = JSON.parse(localStorage.getItem("seriesCache") || "{}");
    const sourceMap = JSON.parse(localStorage.getItem("seriesSourceMap") || "{}");

    items.forEach((item) => {
      if (!item?.id) return;
      seriesCache[item.id] = item;
      if (item.source === SOURCE_MELOLO || item.source === SOURCE_DRAMABOX) {
        sourceMap[item.id] = item.source;
      }
    });

    localStorage.setItem("seriesCache", JSON.stringify(seriesCache));
    localStorage.setItem("seriesSourceMap", JSON.stringify(sourceMap));
  } catch {
    // Ignore localStorage write errors.
  }
}

async function requestFirstSuccess(paths, options) {
  let lastError;
  for (const path of paths) {
    try {
      return await apiRequest(path, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Request gagal.");
}

function meloloEpisodeFallback(seriesId) {
  return [
    {
      id: String(seriesId),
      episode: 1,
      title: "Episode 1",
      vid: String(seriesId),
      streamUrl: "",
      sources: [],
      subtitles: [],
    },
  ];
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

  if (source === SOURCE_MELOLO) {
    if (page > 1) return [];

    const endpointMap = {
      foryou: "api/melolo/latest",
      new: "api/melolo/latest",
      rank: "api/melolo/trending",
    };
    const endpoint = endpointMap[kind] || kind;
    const params = toQuery(restParams);
    const payload = await apiRequest(`/${endpoint}${params ? `?${params}` : ""}`, {
      source,
    });
    const items = parseMeloloCatalogPayload(payload);
    persistSeriesCache(items);
    return items;
  }

  const endpointMap = {
    foryou: "api/recommend",
    new: "api/home",
    rank: "api/vip",
  };
  const endpoint = endpointMap[kind] || kind;
  const params = toQuery({ ...restParams, page });
  const payload = await requestFirstSuccess(
    [`/${endpoint}${params ? `?${params}` : ""}`, `/${endpoint}/${page}`],
    { source },
  );
  const items = parseDramaboxCatalogPayload(payload);
  persistSeriesCache(items);
  return items;
}

export async function fetchCatalogCombined(kind, page = 1, extraParams = {}) {
  const [dramaboxResults, meloloResults] = await Promise.allSettled([
    fetchCatalog(kind, page, { ...extraParams, source: SOURCE_DRAMABOX }),
    fetchCatalog(kind, page, { ...extraParams, source: SOURCE_MELOLO }),
  ]);

  const results = [];
  if (dramaboxResults.status === "fulfilled") results.push(...dramaboxResults.value);
  if (meloloResults.status === "fulfilled") results.push(...meloloResults.value);

  const finalResults = dedupeSeries(results);
  persistSeriesCache(finalResults);
  return finalResults;
}

export async function searchCatalog(query, source = SOURCE_DRAMABOX) {
  const endpoint =
    source === SOURCE_MELOLO
      ? `/api/melolo/search?query=${encodeURIComponent(query)}`
      : `/api/search?keyword=${encodeURIComponent(query)}`;
  const payload = await apiRequest(endpoint, { source });

  const items =
    source === SOURCE_MELOLO
      ? parseMeloloSearchPayload(payload)
      : parseDramaboxSearchPayload(payload);
  persistSeriesCache(items);
  return items;
}

export async function searchCatalogCombined(query) {
  const [dramaboxResults, meloloResults] = await Promise.allSettled([
    searchCatalog(query, SOURCE_DRAMABOX),
    searchCatalog(query, SOURCE_MELOLO),
  ]);

  const results = [];
  if (dramaboxResults.status === "fulfilled") results.push(...dramaboxResults.value);
  if (meloloResults.status === "fulfilled") results.push(...meloloResults.value);
  const finalResults = dedupeSeries(results);
  persistSeriesCache(finalResults);
  return finalResults;
}

export async function fetchSeriesById(seriesId) {
  const preferred = detectSourceFromId(seriesId);
  const orderedProviders =
    preferred === SOURCE_MELOLO
      ? [SOURCE_MELOLO, SOURCE_DRAMABOX]
      : [SOURCE_DRAMABOX, SOURCE_MELOLO];

  for (const provider of orderedProviders) {
    try {
      const detail = await fetchSeriesDetailByProvider(seriesId, provider);
      if (detail?.id) return detail;
    } catch {
      // Coba provider berikutnya.
    }
  }

  return null;
}

export async function fetchEpisodes(seriesId, options = {}, seriesDetail = null) {
  const source = options?.source || detectSourceFromId(seriesId);
  if (source === SOURCE_MELOLO) {
    return fetchEpisodesByProvider(seriesId, SOURCE_MELOLO, seriesDetail);
  }

  const payload = await apiRequest(`/api/chapters/${encodeURIComponent(seriesId)}`, {
    ...options,
    source: SOURCE_DRAMABOX,
  });
  return parseDramaboxEpisodesPayload(payload);
}

export async function fetchSeriesDetail(seriesId) {
  const preferred = detectSourceFromId(seriesId);
  const orderedProviders =
    preferred === SOURCE_MELOLO
      ? [SOURCE_MELOLO, SOURCE_DRAMABOX]
      : [SOURCE_DRAMABOX, SOURCE_MELOLO];

  for (const provider of orderedProviders) {
    try {
      const detail = await fetchSeriesDetailByProvider(seriesId, provider);
      if (detail?.id) return detail;
    } catch {
      // Coba provider berikutnya.
    }
  }

  return parseDramaboxSeriesDetailPayload({}, seriesId);
}

export async function fetchSeriesDetailByProvider(seriesId, provider) {
  const source = resolveSourceFromProvider(provider);

  if (source === SOURCE_MELOLO) {
    const payload = await apiRequest(
      `/api/melolo/detail/${encodeURIComponent(seriesId)}`,
      { source },
    );
    const detail = parseMeloloSeriesDetailPayload(payload, seriesId);
    if (!detail?.id) {
      throw new Error("Series tidak ditemukan di melolo");
    }
    persistSeriesCache([detail]);
    return detail;
  }

  const payload = await apiRequest(`/api/detail/${encodeURIComponent(seriesId)}/v2`, {
    source,
  });
  const detail = parseDramaboxSeriesDetailPayload(payload, seriesId);
  persistSeriesCache([detail]);
  return detail;
}

export async function fetchEpisodesByProvider(
  seriesId,
  provider,
  seriesDetail = null,
) {
  const source = resolveSourceFromProvider(provider);

  if (source === SOURCE_MELOLO) {
    const fromDetail = parseMeloloEpisodesFromSeriesDetail(seriesDetail, seriesId);
    if (fromDetail.length) return fromDetail;

    try {
      const freshDetail = await fetchSeriesDetailByProvider(seriesId, SOURCE_MELOLO);
      const fromFreshDetail = parseMeloloEpisodesFromSeriesDetail(
        freshDetail,
        seriesId,
      );
      if (fromFreshDetail.length) return fromFreshDetail;
    } catch {
      // Gunakan fallback minimal 1 episode.
    }

    return meloloEpisodeFallback(seriesId);
  }

  const payload = await apiRequest(`/api/chapters/${encodeURIComponent(seriesId)}`, {
    source,
  });
  return parseDramaboxEpisodesPayload(payload);
}

export async function fetchStream(seriesId, episodeNumber, options = {}) {
  const source = resolveSource(seriesId, options?.provider || options?.source);

  if (source === SOURCE_MELOLO) {
    const streamVid = String(options?.vid || seriesId || "").trim();
    if (!streamVid) {
      throw new Error("VID Melolo tidak valid.");
    }

    const payload = await apiRequest(
      `/api/melolo/stream/${encodeURIComponent(streamVid)}`,
      { ...options, source: SOURCE_MELOLO },
    );
    const url = parseMeloloStreamUrl(payload);
    if (!url) throw new Error("Link stream tidak ditemukan pada respons API.");
    return url;
  }

  const endpoint = `/api/stream?bookId=${encodeURIComponent(seriesId)}&chapter=${episodeNumber}`;
  const payload = await apiRequest(endpoint, { ...options, source: SOURCE_DRAMABOX });
  const url = parseDramaboxStreamUrl(payload);
  if (!url) throw new Error("Link stream tidak ditemukan pada respons API.");
  return url;
}
