export function findArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const preferredKeys = [
    "data",
    "results",
    "result",
    "items",
    "list",
    "series",
    "chapters",
    "episodes",
  ];

  for (const key of preferredKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = findArray(value);
      if (nested.length) return nested;
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

export function findStringUrl(payload) {
  if (!payload) return "";
  if (typeof payload === "string") {
    return payload.startsWith("http") ? payload : "";
  }

  if (Array.isArray(payload)) {
    for (const value of payload) {
      const hit = findStringUrl(value);
      if (hit) return hit;
    }
    return "";
  }

  if (typeof payload === "object") {
    const keys = [
      "url",
      "stream",
      "stream_url",
      "video_url",
      "video",
      "play_url",
      "m3u8",
      "mp4",
      "source",
    ];

    for (const key of keys) {
      const hit = findStringUrl(payload[key]);
      if (hit) return hit;
    }

    for (const value of Object.values(payload)) {
      const hit = findStringUrl(value);
      if (hit) return hit;
    }
  }

  return "";
}

export function normalizeSeries(item, index) {
  const title =
    item?.bookName ||
    item?.title ||
    item?.name ||
    item?.series_title ||
    item?.drama_title ||
    item?.series_name ||
    "Untitled Series";
  const id =
    item?.bookId ||
    item?.id ||
    item?.series_id ||
    item?.seriesId ||
    item?.drama_id ||
    item?.slug ||
    `${title}-${index}`;

  const genreList = Array.isArray(item?.genres)
    ? item.genres
    : Array.isArray(item?.tags)
      ? item.tags
    : typeof item?.genres === "string"
      ? item.genres.split(",")
      : typeof item?.genre === "string"
        ? item.genre.split(",")
        : [];

  return {
    id: String(id),
    title,
    synopsis:
      item?.introduction || item?.synopsis || item?.description || item?.overview || "",
    poster:
      item?.coverWap ||
      item?.poster ||
      item?.cover ||
      item?.image ||
      item?.thumbnail ||
      item?.thumb ||
      "",
    rating: item?.rating || item?.score || item?.imdb || null,
    status: item?.status || "",
    totalEpisodes:
      item?.chapterCount ||
      item?.total_episodes ||
      item?.episode_count ||
      item?.chapters ||
      item?.chapter_count ||
      null,
    genres: genreList.map((genre) => String(genre).trim()).filter(Boolean),
  };
}

export function normalizeEpisode(item, index) {
  const defaultCdn = Array.isArray(item?.cdnList)
    ? item.cdnList.find((cdn) => cdn?.isDefault) || item.cdnList[0]
    : null;
  const defaultVideo = Array.isArray(defaultCdn?.videoPathList)
    ? defaultCdn.videoPathList.find((video) => video?.isDefault) || defaultCdn.videoPathList[0]
    : null;
  const allSources = Array.isArray(item?.cdnList)
    ? item.cdnList
        .flatMap((cdn) => (Array.isArray(cdn?.videoPathList) ? cdn.videoPathList : []))
        .map((video) => ({
          quality: Number(video?.quality) || 0,
          url: video?.videoPath || "",
          isDefault: Boolean(video?.isDefault),
        }))
        .filter((source) => source.url)
    : [];
  const qualityMap = new Map();
  for (const source of allSources) {
    const key = String(source.quality);
    const existing = qualityMap.get(key);
    if (!existing || source.isDefault) {
      qualityMap.set(key, source);
    }
  }
  const uniqueSources = Array.from(qualityMap.values()).sort((a, b) => b.quality - a.quality);

  const rawEpisode =
    item?.chapterIndex + 1 ||
    item?.chapterName?.replace(/[^\d]/g, "") ||
    item?.episode ||
    item?.ep ||
    item?.chapter ||
    item?.number ||
    item?.episode_no ||
    index + 1;
  const episodeNumber = Number(rawEpisode);

  return {
    id: String(item?.chapterId || item?.id || item?.episode_id || `${rawEpisode}-${index}`),
    episode: Number.isFinite(episodeNumber) ? episodeNumber : index + 1,
    title: item?.chapterName || item?.title || item?.name || `Episode ${rawEpisode}`,
    thumbnail: item?.chapterImg || item?.thumbnail || item?.image || item?.poster || "",
    duration: item?.duration || item?.runtime || "",
    streamUrl: defaultVideo?.videoPath || "",
    sources: uniqueSources,
  };
}
