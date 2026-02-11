import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { API_CONFIG } from "../config/api";
import { fetchEpisodes, fetchSeriesDetail, fetchStream } from "../lib/apiClient";

function estimateBitrate(height) {
  if (height >= 1080) return 5500000;
  if (height >= 720) return 3000000;
  if (height >= 540) return 1800000;
  if (height >= 360) return 1000000;
  return 450000;
}

function findInternalSymbol(target, description) {
  let current = target;
  while (current) {
    const match = Object.getOwnPropertySymbols(current).find((symbol) => symbol.description === description);
    if (match) return match;
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function subtitleTrackUrl(url) {
  if (!url) return "";
  const gateway = API_CONFIG.cacheGatewayUrl?.trim();
  if (!gateway) return url;

  try {
    const endpoint = new URL(gateway);
    endpoint.pathname = endpoint.pathname.replace(/\/cache\/?$/i, "/subtitle");
    if (!/\/subtitle$/i.test(endpoint.pathname)) {
      endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/subtitle`;
    }
    endpoint.search = "";
    endpoint.searchParams.set("url", url);
    return endpoint.toString();
  } catch {
    return url;
  }
}

function WatchPage() {
  const { seriesId } = useParams();
  const location = useLocation();
  const series = useMemo(() => location.state?.series || null, [location.state]);
  const playerRef = useRef(null);
  const shouldAutoPlayRef = useRef(false);
  const refreshRetryRef = useRef(new Set());
  const sourceRetryRef = useRef(new Set());
  const syncingQualityMenuRef = useRef(false);
  const [seriesDetail, setSeriesDetail] = useState(series);

  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [quality, setQuality] = useState("auto");
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingStream, setLoadingStream] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(!series);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshRetryRef.current = new Set();
    sourceRetryRef.current = new Set();
  }, [seriesId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingDetail(true);
      try {
        const detail = await fetchSeriesDetail(seriesId);
        if (!cancelled) {
          setSeriesDetail((prev) => ({ ...prev, ...detail }));
        }
      } catch {
        if (!cancelled && !series) {
          setSeriesDetail(null);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [series, seriesId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingEpisodes(true);
      setError("");
      try {
        const list = await fetchEpisodes(seriesId);
        if (!cancelled) setEpisodes(list);
      } catch (err) {
        if (!cancelled) {
          setEpisodes([]);
          setError(err instanceof Error ? err.message : "Gagal memuat episode.");
        }
      } finally {
        if (!cancelled) setLoadingEpisodes(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  const canAutoNext = useMemo(() => {
    if (!selectedEpisode) return false;
    return episodes.some((episode) => Number(episode.episode) > Number(selectedEpisode.episode));
  }, [episodes, selectedEpisode]);

  async function handleWatch(episode, preferredQuality = null, shouldAutoPlay = false) {
    setSelectedEpisode(episode);
    sourceRetryRef.current = new Set(
      [...sourceRetryRef.current].filter((key) => !key.startsWith(`${episode.id}|`)),
    );
    setLoadingStream(true);
    setError("");
    shouldAutoPlayRef.current = shouldAutoPlay;

    try {
      const preferredSource =
        preferredQuality && preferredQuality !== "auto"
          ? episode?.sources?.find((source) => String(source.quality) === String(preferredQuality))
          : null;
      const defaultSource = episode?.sources?.find((source) => source.isDefault) || episode?.sources?.[0];
      const activeSource = preferredSource || defaultSource;
      const url = activeSource?.url || episode.streamUrl || (await fetchStream(seriesId, episode.episode));
      setStreamUrl(url);
      setQuality(activeSource ? String(activeSource.quality || "auto") : "auto");
      if (shouldAutoPlay) {
        setTimeout(() => {
          tryAutoPlay();
        }, 180);
      }
    } catch (err) {
      setStreamUrl("");
      setError(err instanceof Error ? err.message : "Gagal memuat stream.");
    } finally {
      setLoadingStream(false);
    }
  }

  function applyQuality(nextQuality) {
    setQuality(nextQuality);
    if (!selectedEpisode?.sources?.length) return;

    const selectedSource =
      nextQuality === "auto"
        ? selectedEpisode.sources.find((source) => source.isDefault) || selectedEpisode.sources[0]
        : selectedEpisode.sources.find((source) => String(source.quality) === String(nextQuality));

    if (!selectedSource?.url || selectedSource.url === streamUrl) return;
    const currentTime = playerRef.current?.currentTime ?? 0;
    const shouldContinue = !playerRef.current?.paused;
    setStreamUrl(selectedSource.url);

    requestAnimationFrame(() => {
      if (!playerRef.current) return;
      playerRef.current.currentTime = currentTime;
      if (shouldContinue) playerRef.current.play().catch(() => {});
    });
  }

  function handleEnded() {
    if (!selectedEpisode) return;
    const currentIndex = episodes.findIndex((episode) => episode.id === selectedEpisode.id);
    if (currentIndex === -1) return;
    const nextEpisode = episodes[currentIndex + 1];
    if (!nextEpisode) return;
    handleWatch(nextEpisode, quality, true);
  }

  async function tryAutoPlay() {
    const node = playerRef.current;
    if (!node) return;

    try {
      await node.play?.();
    } catch {
      // Biarkan user menekan play manual jika autoplay diblokir.
    }
  }

  useEffect(() => {
    const node = playerRef.current;
    if (!node) return;
    node.addEventListener("ended", handleEnded);
    return () => {
      node.removeEventListener("ended", handleEnded);
    };
  });

  useEffect(() => {
    const node = playerRef.current;
    if (!node || !selectedEpisode) return;

    function episodeSourceUrls() {
      if (!selectedEpisode?.sources?.length) return [];
      const preferredSource =
        quality && quality !== "auto"
          ? selectedEpisode.sources.find((source) => String(source.quality) === String(quality))
          : selectedEpisode.sources.find((source) => source.isDefault) || selectedEpisode.sources[0];
      if (!preferredSource) return [];

      const urls = [preferredSource.url, ...(preferredSource.backupUrls || [])].filter(Boolean);
      const seen = new Set();
      return urls.filter((url) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
    }

    async function handleStreamError() {
      const orderedUrls = episodeSourceUrls();
      const currentUrlIndex = orderedUrls.findIndex((url) => url === streamUrl);
      if (currentUrlIndex !== -1 && currentUrlIndex + 1 < orderedUrls.length) {
        const nextUrl = orderedUrls[currentUrlIndex + 1];
        const retryKey = `${selectedEpisode.id}|${nextUrl}`;
        if (!sourceRetryRef.current.has(retryKey)) {
          sourceRetryRef.current.add(retryKey);
          setStreamUrl(nextUrl);
          shouldAutoPlayRef.current = true;
          return;
        }
      }

      const episodeKey = String(selectedEpisode.id);
      if (refreshRetryRef.current.has(episodeKey)) return;
      refreshRetryRef.current.add(episodeKey);

      try {
        const freshUrl = await fetchStream(seriesId, selectedEpisode.episode, { forceRefresh: true });
        if (!freshUrl || freshUrl === streamUrl) return;
        setStreamUrl(freshUrl);
        shouldAutoPlayRef.current = true;
      } catch {
        // Keep existing error behavior if refresh fails.
      }
    }

    node.addEventListener("error", handleStreamError);
    return () => {
      node.removeEventListener("error", handleStreamError);
    };
  }, [quality, selectedEpisode, seriesId, streamUrl]);

  useEffect(() => {
    if (!streamUrl || !shouldAutoPlayRef.current) return;
    shouldAutoPlayRef.current = false;
    const node = playerRef.current;
    if (!node) return;

    const onReady = () => {
      tryAutoPlay();
    };

    node.addEventListener("loadedmetadata", onReady, { once: true });
    node.addEventListener("canplay", onReady, { once: true });
    node.addEventListener("can-play", onReady, { once: true });
    node.addEventListener("can-play-through", onReady, { once: true });
    const timer = setTimeout(onReady, 120);

    return () => {
      clearTimeout(timer);
      node.removeEventListener("loadedmetadata", onReady);
      node.removeEventListener("canplay", onReady);
      node.removeEventListener("can-play", onReady);
      node.removeEventListener("can-play-through", onReady);
    };
  }, [streamUrl]);

  useEffect(() => {
    const node = playerRef.current;
    if (!node || !streamUrl) return;
    node.muted = false;
  }, [streamUrl]);

  useEffect(() => {
    const node = playerRef.current;
    const list = node?.qualities;
    if (!node || !list) return;

    const addSymbol = findInternalSymbol(list, "LIST_ADD");
    const resetSymbol = findInternalSymbol(list, "LIST_RESET");
    const selectSymbol = findInternalSymbol(list, "LIST_SELECT");
    const setReadonlySymbol = findInternalSymbol(list, "LIST_SET_READONLY");
    const setAutoSymbol = findInternalSymbol(list, "SET_AUTO_QUALITY");
    if (!addSymbol || !resetSymbol || !selectSymbol) return;

    const syncQualityMenu = () => {
      const sources = selectedEpisode?.sources || [];
      syncingQualityMenuRef.current = true;
      try {
        list[resetSymbol]?.();
        if (setReadonlySymbol) list[setReadonlySymbol](false);

        sources.forEach((source, index) => {
          const height = Number(source.quality) || 0;
          list[addSymbol](
            {
              id: `manual-${height}-${index}`,
              width: 0,
              height,
              bitrate: estimateBitrate(height),
            },
            undefined,
          );
        });

        const activeSource =
          quality === "auto"
            ? sources.find((source) => source.isDefault) || sources[0]
            : sources.find((source) => String(source.quality) === String(quality)) ||
              sources.find((source) => source.isDefault) ||
              sources[0];

        const activeHeight = Number(activeSource?.quality) || 0;
        const activeQualityItem = list.toArray().find((item) => Number(item.height) === activeHeight);
        if (activeQualityItem) {
          list[selectSymbol](activeQualityItem, true);
        }

        if (setAutoSymbol) list[setAutoSymbol](quality === "auto");
      } finally {
        setTimeout(() => {
          syncingQualityMenuRef.current = false;
        }, 0);
      }
    };

    syncQualityMenu();
    node.addEventListener("loadedmetadata", syncQualityMenu);
    node.addEventListener("canplay", syncQualityMenu);
    return () => {
      node.removeEventListener("loadedmetadata", syncQualityMenu);
      node.removeEventListener("canplay", syncQualityMenu);
    };
  }, [quality, selectedEpisode, streamUrl, loadingStream]);

  useEffect(() => {
    const node = playerRef.current;
    const list = node?.qualities;
    if (!node || !list) return;

    const onQualityChanged = () => {
      if (syncingQualityMenuRef.current) return;
      const selectedQuality = list.selected;
      if (!selectedQuality) return;
      const nextQuality = String(Number(selectedQuality.height) || "auto");
      if (!nextQuality || nextQuality === quality) return;
      applyQuality(nextQuality);
    };

    const onQualityRequest = (event) => {
      if (syncingQualityMenuRef.current) return;
      if (Number(event.detail) !== -1) return;
      if (quality === "auto") return;
      applyQuality("auto");
    };

    list.addEventListener("change", onQualityChanged);
    node.addEventListener("media-quality-change-request", onQualityRequest);
    return () => {
      list.removeEventListener("change", onQualityChanged);
      node.removeEventListener("media-quality-change-request", onQualityRequest);
    };
  }, [quality, selectedEpisode, streamUrl]);

  return (
    <main className="watch-panel page-panel">
      <div className="panel-heading">
        <h2>{seriesDetail?.title || `Series ${seriesId}`}</h2>
        <Link className="tab" to="/for-you">
          Kembali
        </Link>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {loadingDetail && <p className="muted">Memuat detail judul...</p>}

      {seriesDetail?.genres?.length ? (
        <div className="genres">
          {seriesDetail.genres.map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
      ) : null}

      {seriesDetail ? (
        <section className="detail-card">
          <div className="detail-cover">
            {seriesDetail.poster ? <img src={seriesDetail.poster} alt={seriesDetail.title} /> : null}
          </div>
          <div className="detail-body">
            <h3>{seriesDetail.title}</h3>
            <p>{seriesDetail.synopsis || "Sinopsis belum tersedia."}</p>
            <div className="meta">
              <span>Total Episode: {seriesDetail.totalEpisodes || episodes.length || "-"}</span>
              <span>Rating: {seriesDetail.rating || "-"}</span>
            </div>
          </div>
        </section>
      ) : null}

      <div className="player-wrap">
        {loadingStream ? (
          <p className="muted">Menyiapkan stream...</p>
        ) : streamUrl ? (
          <>
            <media-player
              key={`${selectedEpisode?.id || "idle"}:${streamUrl || "empty"}`}
              ref={playerRef}
              class="vds-player"
              src={streamUrl}
              poster={seriesDetail?.poster || ""}
              title={seriesDetail?.title || `Series ${seriesId}`}
              crossorigin="anonymous"
              playsinline
              fullscreen-orientation="none"
              muted={false}
            >
              <media-outlet>
                {(selectedEpisode?.subtitles || []).map((track, index) => (
                  <track
                    key={`${track.url}-${index}`}
                    src={subtitleTrackUrl(track.url)}
                    kind="subtitles"
                    label={track.label || `Subtitle ${index + 1}`}
                    srclang={track.lang || "id"}
                    data-type="vtt"
                    default={Boolean(track.isDefault || index === 0)}
                  />
                ))}
              </media-outlet>
              <media-community-skin />
            </media-player>
          </>
        ) : (
          <p className="muted">Pilih episode untuk mulai menonton.</p>
        )}
      </div>

      {selectedEpisode ? (
        <div className="player-tools">
          <small>{canAutoNext ? "Auto-next aktif" : "Episode terakhir"}</small>
          <small>Subtitle diatur dari menu roda gerigi player.</small>
        </div>
      ) : null}

      <h3>Episode</h3>
      {loadingEpisodes ? (
        <p className="muted">Memuat episode...</p>
      ) : episodes.length ? (
        <div className="episode-list">
          {episodes.map((episode) => (
            <button
              key={episode.id}
              className={selectedEpisode?.id === episode.id ? "episode-btn active" : "episode-btn"}
              onClick={() => handleWatch(episode)}
            >
              <span>Episode {episode.episode}</span>
              <small>{episode.duration || episode.title}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Episode belum tersedia.</p>
      )}
    </main>
  );
}

export default WatchPage;
