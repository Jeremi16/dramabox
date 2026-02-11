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
  function inferLang(value) {
    const input = String(value || "").trim().toLowerCase();
    if (!input) return { lang: "id", label: "Indonesian" };
    if (input === "id" || input === "in" || input.includes("indo")) {
      return { lang: "id", label: "Indonesian" };
    }
    if (input === "en" || input.includes("eng")) return { lang: "en", label: "English" };
    return { lang: input.slice(0, 2), label: String(value) };
  }

  function collectSubtitleTracks(payload, bucket) {
    if (!payload) return;

    if (typeof payload === "string") {
      const url = payload.trim();
      if (/^https?:\/\//i.test(url) && /\.srt(\?|#|$)/i.test(url)) {
        bucket.push({ url, kind: "subtitles" });
      }
      return;
    }

    if (Array.isArray(payload)) {
      payload.forEach((entry) => collectSubtitleTracks(entry, bucket));
      return;
    }

    if (typeof payload !== "object") return;

    const objectUrl =
      payload.srtUrl ||
      payload.subtitleUrl ||
      payload.subtitle_url ||
      payload.url ||
      payload.file ||
      payload.path ||
      "";
    if (typeof objectUrl === "string" && /^https?:\/\//i.test(objectUrl) && /\.srt(\?|#|$)/i.test(objectUrl)) {
      const langMeta = inferLang(
        payload.lang ||
          payload.language ||
          payload.captionLanguage ||
          payload.srclang ||
          payload.label,
      );
      bucket.push({
        url: objectUrl,
        label: payload.label || langMeta.label,
        lang: payload.srclang || langMeta.lang,
        kind: payload.kind || "subtitles",
        isDefault: Boolean(payload.default || payload.isDefault),
      });
    }

    const subtitleKeys = [
      "subtitle",
      "subtitles",
      "subLanguageVoList",
      "subtitleList",
      "subtitle_list",
      "subtitlePath",
      "subtitle_path",
      "subtitleUrl",
      "subtitle_url",
      "srt",
      "srtUrl",
      "caption",
      "captions",
      "tracks",
    ];
    subtitleKeys.forEach((key) => {
      if (key in payload) collectSubtitleTracks(payload[key], bucket);
    });
  }

  const defaultCdn = Array.isArray(item?.cdnList)
    ? item.cdnList.find((cdn) => cdn?.isDefault) || item.cdnList[0]
    : null;
  const defaultVideo = Array.isArray(defaultCdn?.videoPathList)
    ? defaultCdn.videoPathList.find((video) => video?.isDefault) || defaultCdn.videoPathList[0]
    : null;
  const allSources = Array.isArray(item?.cdnList)
    ? item.cdnList
        .flatMap((cdn, cdnIndex) =>
          (Array.isArray(cdn?.videoPathList) ? cdn.videoPathList : []).map((video) => ({
            ...video,
            __cdnIndex: cdnIndex,
            __cdnDefault: Boolean(cdn?.isDefault),
          })),
        )
        .map((video) => ({
          quality: Number(video?.quality) || 0,
          url: video?.videoPath || "",
          isDefault: Boolean(video?.isDefault),
          cdnIndex: Number(video?.__cdnIndex) || 0,
          cdnDefault: Boolean(video?.__cdnDefault),
        }))
        .filter((source) => source.url)
    : [];
  const qualityMap = new Map();
  for (const source of allSources) {
    const key = String(source.quality);
    if (!qualityMap.has(key)) qualityMap.set(key, []);
    qualityMap.get(key).push(source);
  }
  const uniqueSources = Array.from(qualityMap.entries())
    .map(([qualityKey, entries]) => {
      const ordered = [...entries].sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        if (a.cdnDefault !== b.cdnDefault) return a.cdnDefault ? -1 : 1;
        return a.cdnIndex - b.cdnIndex;
      });
      const primary = ordered[0];
      const seen = new Set([primary?.url]);
      const backupUrls = ordered
        .map((entry) => entry.url)
        .filter((url) => {
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        });

      return {
        quality: Number(qualityKey) || 0,
        url: primary?.url || "",
        isDefault: Boolean(primary?.isDefault),
        backupUrls,
      };
    })
    .filter((source) => source.url)
    .sort((a, b) => b.quality - a.quality);
  const subtitleBucket = [];
  collectSubtitleTracks(item, subtitleBucket);

  const subtitleMap = new Map();
  subtitleBucket.forEach((track, indexTrack) => {
    if (!track?.url) return;
    const key = track.url;
    const langMeta = inferLang(track.lang || track.label);
    if (!subtitleMap.has(key)) {
      subtitleMap.set(key, {
        id: `${index}-${indexTrack}`,
        url: key,
        label: track.label || langMeta.label,
        lang: track.lang || langMeta.lang,
        kind: track.kind || "subtitles",
        isDefault: Boolean(track.isDefault) || subtitleMap.size === 0,
      });
    } else if (track.isDefault) {
      const existing = subtitleMap.get(key);
      subtitleMap.set(key, { ...existing, isDefault: true });
    }
  });
  const subtitles = Array.from(subtitleMap.values());

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
    subtitles,
  };
}
