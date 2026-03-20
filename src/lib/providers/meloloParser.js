import { findArray, findStringUrl } from "../normalizers";

const SOURCE_MELOLO = "melolo";

function toPositiveInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseCategorySchema(schema) {
  if (!schema) return [];
  if (Array.isArray(schema)) {
    return schema
      .map((item) => String(item?.name || item?.tagName || "").trim())
      .filter(Boolean);
  }

  if (typeof schema !== "string") return [];
  try {
    const parsed = JSON.parse(schema);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item?.name || item?.tagName || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function formatDurationSeconds(rawSeconds) {
  const seconds = toPositiveInt(rawSeconds);
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function normalizeMeloloEpisode(video, index, fallbackSeriesId) {
  const episodeNumber = toPositiveInt(video?.vid_index, index + 1);
  const vid = String(video?.vid || "").trim();
  const episodeTitleCandidate = String(video?.title || "").trim();
  const episodeTitle =
    episodeTitleCandidate && episodeTitleCandidate.length <= 80
      ? episodeTitleCandidate
      : `Episode ${episodeNumber}`;

  return {
    id: vid || `${fallbackSeriesId}-${episodeNumber}`,
    episode: episodeNumber,
    title: episodeTitle,
    thumbnail: video?.episode_cover || video?.cover || "",
    duration: formatDurationSeconds(video?.duration),
    streamUrl: "",
    vid: vid || String(fallbackSeriesId),
    sources: [],
    subtitles: [],
  };
}

function normalizeMeloloSeriesItem(item, index = 0) {
  const id =
    item?.series_id_str ||
    item?.book_id ||
    item?.bookId ||
    item?.series_id ||
    item?.seriesId ||
    item?.id ||
    `melolo-${index}`;

  const genres = [
    ...parseCategorySchema(item?.category_schema),
    ...(Array.isArray(item?.tags)
      ? item.tags
      : Array.isArray(item?.tagV3s)
        ? item.tagV3s.map((tag) => tag?.tagName || tag?.name || "")
        : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const videoList = Array.isArray(item?.video_list) ? item.video_list : [];
  const episodesData = videoList
    .map((video, idx) => normalizeMeloloEpisode(video, idx, id))
    .sort((a, b) => a.episode - b.episode);

  return {
    id: String(id),
    source: SOURCE_MELOLO,
    title:
      item?.book_name ||
      item?.bookName ||
      item?.series_title ||
      item?.title ||
      "Untitled Series",
    synopsis:
      item?.series_intro ||
      item?.book_intro ||
      item?.abstract ||
      item?.introduction ||
      item?.description ||
      "",
    poster:
      item?.series_cover ||
      item?.thumb_url ||
      item?.coverWap ||
      item?.cover ||
      item?.poster ||
      item?.image ||
      "",
    rating:
      item?.rating ||
      item?.score ||
      (toPositiveInt(item?.followed_cnt)
        ? `${item.followed_cnt} followers`
        : null),
    status: item?.series_status || item?.status || "",
    totalEpisodes:
      toPositiveInt(item?.episode_cnt) ||
      toPositiveInt(item?.episode_count) ||
      toPositiveInt(item?.serial_count) ||
      episodesData.length ||
      null,
    firstChapterId: episodesData[0]?.vid || null,
    lastChapterId: episodesData[episodesData.length - 1]?.vid || null,
    genres: Array.from(new Set(genres)),
    episodesData,
  };
}

export function parseMeloloCatalogPayload(payload) {
  const items = Array.isArray(payload?.books)
    ? payload.books
    : Array.isArray(payload?.data?.books)
      ? payload.data.books
      : findArray(payload);

  return items
    .map((item, index) => normalizeMeloloSeriesItem(item, index))
    .filter((item) => item.title);
}

export function parseMeloloSearchPayload(payload) {
  return parseMeloloCatalogPayload(payload);
}

export function extractMeloloVideoData(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (
    payload?.data?.video_data &&
    typeof payload.data.video_data === "object"
  ) {
    return payload.data.video_data;
  }
  if (payload?.video_data && typeof payload.video_data === "object") {
    return payload.video_data;
  }
  if (
    payload?.data &&
    typeof payload.data === "object" &&
    (payload.data.series_id_str ||
      payload.data.series_title ||
      payload.data.video_list)
  ) {
    return payload.data;
  }
  return null;
}

export function parseMeloloSeriesDetailPayload(payload, fallbackSeriesId) {
  const videoData = extractMeloloVideoData(payload);
  if (!videoData) return null;
  const normalized = normalizeMeloloSeriesItem(videoData, 0);

  if (!normalized.id && fallbackSeriesId) {
    normalized.id = String(fallbackSeriesId);
  }

  if (!normalized.firstChapterId && normalized.episodesData?.length) {
    normalized.firstChapterId = normalized.episodesData[0].vid;
  }

  if (!normalized.lastChapterId && normalized.episodesData?.length) {
    normalized.lastChapterId =
      normalized.episodesData[normalized.episodesData.length - 1].vid;
  }

  if (!normalized.totalEpisodes && normalized.episodesData?.length) {
    normalized.totalEpisodes = normalized.episodesData.length;
  }

  return normalized;
}

export function parseMeloloEpisodesFromSeriesDetail(
  seriesDetail,
  fallbackSeriesId,
) {
  const list = Array.isArray(seriesDetail?.episodesData)
    ? seriesDetail.episodesData
    : [];
  if (!list.length) return [];

  return list
    .map((episode, index) => ({
      ...episode,
      id: String(
        episode.id || episode.vid || `${fallbackSeriesId}-${index + 1}`,
      ),
      episode: toPositiveInt(episode.episode, index + 1),
      vid: String(episode.vid || fallbackSeriesId),
    }))
    .sort((a, b) => a.episode - b.episode);
}

export function parseMeloloStreamUrl(payload) {
  const directUrl =
    payload?.data?.main_url ||
    payload?.data?.backup_url ||
    payload?.main_url ||
    payload?.backup_url ||
    "";
  if (typeof directUrl === "string" && directUrl.startsWith("http")) {
    // Force HTTPS untuk menghindari Mixed Content error
    return directUrl.replace(/^http:\/\//, "https://");
  }
  return findStringUrl(payload);
}
