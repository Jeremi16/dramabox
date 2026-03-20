import localforage from "localforage";

const watchStore = localforage.createInstance({
  name: "dramabox-watch-history"
});

export async function saveWatchProgress(seriesId, episodeNumber, progress, seriesData = {}) {
  const key = `watch_${seriesId}`;
  const data = {
    seriesId,
    episodeNumber,
    progress,
    timestamp: Date.now(),
    title: seriesData.title || "",
    poster: seriesData.poster || "",
    totalEpisodes: seriesData.totalEpisodes || null,
  };
  await watchStore.setItem(key, data);
  return data;
}

export async function getWatchProgress(seriesId) {
  const key = `watch_${seriesId}`;
  return await watchStore.getItem(key);
}

export async function getAllWatchHistory() {
  const keys = await watchStore.keys();
  const history = [];
  for (const key of keys) {
    if (key.startsWith("watch_")) {
      const data = await watchStore.getItem(key);
      if (data) history.push(data);
    }
  }
  return history.sort((a, b) => b.timestamp - a.timestamp);
}

export async function removeWatchHistory(seriesId) {
  const key = `watch_${seriesId}`;
  await watchStore.removeItem(key);
}
