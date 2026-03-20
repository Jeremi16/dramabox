import {
  findArray,
  findStringUrl,
  normalizeEpisode,
  normalizeSeries,
} from "../normalizers";

const SOURCE_DRAMABOX = "dramabox";

export function parseDramaboxCatalogPayload(payload) {
  return findArray(payload)
    .map((item, index) => normalizeSeries(item, index, SOURCE_DRAMABOX))
    .filter((item) => item.title);
}

export function parseDramaboxSearchPayload(payload) {
  return parseDramaboxCatalogPayload(payload);
}

export function parseDramaboxSeriesDetailPayload(payload, fallbackSeriesId) {
  if (!payload || typeof payload !== "object") {
    return normalizeSeries({ bookId: fallbackSeriesId }, 0, SOURCE_DRAMABOX);
  }

  const dataCandidate =
    payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : null;

  if (dataCandidate && (dataCandidate.bookId || dataCandidate.bookName)) {
    return normalizeSeries(dataCandidate, 0, SOURCE_DRAMABOX);
  }

  if (
    payload.bookId ||
    payload.bookName ||
    payload.coverWap ||
    payload.introduction
  ) {
    return normalizeSeries(payload, 0, SOURCE_DRAMABOX);
  }

  const arrayCandidate = findArray(payload);
  if (arrayCandidate.length) {
    return normalizeSeries(arrayCandidate[0], 0, SOURCE_DRAMABOX);
  }

  return normalizeSeries({ bookId: fallbackSeriesId }, 0, SOURCE_DRAMABOX);
}

export function parseDramaboxEpisodesPayload(payload) {
  return findArray(payload)
    .map((item, index) => normalizeEpisode(item, index))
    .sort((a, b) => a.episode - b.episode);
}

export function parseDramaboxStreamUrl(payload) {
  return findStringUrl(payload);
}
