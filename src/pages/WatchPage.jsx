import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { API_CONFIG } from "../config/api";
import {
  fetchEpisodes,
  fetchEpisodesByProvider,
  fetchSeriesDetail,
  fetchSeriesDetailByProvider,
  fetchStream,
} from "../lib/apiClient";
import { useContinueWatching } from "../hooks/useContinueWatching";
import HeicImage from "../components/HeicImage";
import "./WatchPage.css";

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
    const directMatch = Object.getOwnPropertySymbols(current).find(
      (symbol) => symbol.description === description,
    );
    if (directMatch) return directMatch;
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function resolveQualityListSymbols(list) {
  const level1 = Object.getPrototypeOf(list);
  const level2 = level1 ? Object.getPrototypeOf(level1) : null;
  const level3 = level2 ? Object.getPrototypeOf(level2) : null;

  const selectByDescription = findInternalSymbol(list, "LIST_SELECT");
  const addByDescription = findInternalSymbol(list, "LIST_ADD");
  const resetByDescription = findInternalSymbol(list, "LIST_RESET");
  const setReadonlyByDescription = findInternalSymbol(
    list,
    "LIST_SET_READONLY",
  );
  const setAutoByDescription = findInternalSymbol(list, "SET_AUTO_QUALITY");

  const selectSymbol =
    selectByDescription ||
    Object.getOwnPropertySymbols(level2 || {}).find((symbol) => {
      const fn = level2?.[symbol];
      return typeof fn === "function" && fn.length === 3;
    }) ||
    null;

  const resetSymbol =
    resetByDescription ||
    Object.getOwnPropertySymbols(level3 || {}).find((symbol) => {
      const fn = level3?.[symbol];
      return typeof fn === "function" && fn.length === 1;
    }) ||
    null;

  const addSymbol =
    addByDescription ||
    Object.getOwnPropertySymbols(level3 || {}).find((symbol) => {
      const fn = level3?.[symbol];
      if (typeof fn !== "function" || fn.length !== 2) return false;
      const source = String(fn);
      return source.includes(".push(") || source.includes("push(");
    }) ||
    null;

  const setReadonlySymbol =
    setReadonlyByDescription ||
    Object.getOwnPropertySymbols(level3 || {}).find((symbol) => {
      const fn = level3?.[symbol];
      if (typeof fn !== "function" || fn.length !== 2) return false;
      const source = String(fn);
      return source.includes("readonly-change");
    }) ||
    null;

  const setAutoSymbol =
    setAutoByDescription ||
    Object.getOwnPropertySymbols(level1 || {}).find((symbol) => {
      const fn = level1?.[symbol];
      if (typeof fn !== "function" || fn.length !== 2) return false;
      const source = String(fn);
      return source.includes("auto-change");
    }) ||
    null;

  return {
    addSymbol,
    resetSymbol,
    selectSymbol,
    setReadonlySymbol,
    setAutoSymbol,
  };
}

function subtitleTrackUrl(url) {
  if (!url) return "";
  if (!/\.srt(\?|#|$)/i.test(url)) return url;
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

function pickPreferredValue(nextValue, prevValue) {
  if (nextValue === undefined || nextValue === null) return prevValue;
  if (typeof nextValue === "string" && nextValue.trim() === "") {
    return prevValue;
  }
  if (Array.isArray(nextValue) && nextValue.length === 0) return prevValue;
  return nextValue;
}

function mergeSeriesDetailData(prev = {}, next = {}) {
  if (!next || typeof next !== "object") return prev || {};
  if (!prev || typeof prev !== "object") return next;

  return {
    ...prev,
    ...next,
    source: pickPreferredValue(next.source, prev.source),
    title: pickPreferredValue(next.title, prev.title),
    synopsis: pickPreferredValue(next.synopsis, prev.synopsis),
    poster: pickPreferredValue(next.poster, prev.poster),
    rating: pickPreferredValue(next.rating, prev.rating),
    status: pickPreferredValue(next.status, prev.status),
    totalEpisodes: pickPreferredValue(next.totalEpisodes, prev.totalEpisodes),
    firstChapterId: pickPreferredValue(next.firstChapterId, prev.firstChapterId),
    lastChapterId: pickPreferredValue(next.lastChapterId, prev.lastChapterId),
    genres:
      Array.isArray(next.genres) && next.genres.length
        ? next.genres
        : prev.genres,
  };
}

function WatchPage() {
  const { seriesId, provider } = useParams();
  const location = useLocation();

  // Coba ambil dari location.state dulu, jika tidak ada coba dari localStorage
  const series = useMemo(() => {
    if (location.state?.series?.id === seriesId) {
      return location.state.series;
    }
    if (provider === "melolo") {
      return null;
    }
    // Coba ambil dari cache
    try {
      const seriesCache = JSON.parse(
        localStorage.getItem("seriesCache") || "{}",
      );
      return seriesCache[seriesId] || null;
    } catch {
      return null;
    }
  }, [location.state, provider, seriesId]);

  // Provider dari URL (dramabox/melolo) atau dari state/cache
  const detectedProvider = useMemo(() => {
    if (provider === "dramabox" || provider === "melolo") {
      return provider;
    }
    // Fallback ke provider dari series data
    return series?.source || null;
  }, [provider, series]);

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
  const episodesRef = useRef([]);

  // Continue watching feature
  useContinueWatching(
    seriesId,
    selectedEpisode?.episode,
    {
      title: seriesDetail?.title,
      poster: seriesDetail?.poster,
      totalEpisodes: episodes.length,
    },
    playerRef,
  );

  useEffect(() => {
    episodesRef.current = episodes;
  }, [episodes]);

  useEffect(() => {
    refreshRetryRef.current = new Set();
    sourceRetryRef.current = new Set();
  }, [seriesId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingDetail(true);
      try {
        // Selalu gunakan data dari state jika tersedia dan sama ID-nya
        const initialData = series?.id === seriesId ? series : null;
        if (initialData) {
          setSeriesDetail(initialData);
        }

        // Fetch detail dari API (bisa dari provider atau auto-detect)
        let detail = null;
        if (detectedProvider) {
          detail = await fetchSeriesDetailByProvider(
            seriesId,
            detectedProvider,
          );
        } else {
          detail = await fetchSeriesDetail(seriesId);
        }

        if (!cancelled && detail) {
          // Jangan timpa data existing dengan nilai kosong dari API detail.
          setSeriesDetail((prev) => mergeSeriesDetailData(prev, detail));
          // Simpan ke cache
          try {
            const seriesCache = JSON.parse(
              localStorage.getItem("seriesCache") || "{}",
            );
            seriesCache[seriesId] = mergeSeriesDetailData(
              seriesCache[seriesId] || initialData,
              detail,
            );
            localStorage.setItem("seriesCache", JSON.stringify(seriesCache));
          } catch {
            // Ignore
          }
        }
      } catch (error) {
        console.error("Error fetching detail:", error);
        // Jika gagal dan tidak ada data awal, tampilkan error
        if (!cancelled && !seriesDetail) {
          setSeriesDetail({
            id: seriesId,
            title: "Series tidak ditemukan",
          });
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [series, seriesId, detectedProvider]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingEpisodes(true);
      setError("");
      try {
        // Jika provider diketahui, gunakan fetch by provider
        if (detectedProvider) {
          const list = await fetchEpisodesByProvider(
            seriesId,
            detectedProvider,
            seriesDetail,
          );
          if (!cancelled) setEpisodes(list);
        } else {
          // Fallback
          const list = await fetchEpisodes(seriesId, {}, seriesDetail);
          if (!cancelled) setEpisodes(list);
        }
      } catch (err) {
        if (!cancelled) {
          if (!episodesRef.current.length) {
            setEpisodes([]);
          }
          setError(
            err instanceof Error ? err.message : "Gagal memuat episode.",
          );
        }
      } finally {
        if (!cancelled) setLoadingEpisodes(false);
      }
    }

    // Jalankan fetch episodes (sama untuk navigation dan direct URL)
    run();

    return () => {
      cancelled = true;
    };
  }, [
    seriesId,
    detectedProvider,
    seriesDetail?.firstChapterId,
    seriesDetail?.totalEpisodes,
  ]);

  const canAutoNext = useMemo(() => {
    if (!selectedEpisode) return false;
    return episodes.some(
      (episode) => Number(episode.episode) > Number(selectedEpisode.episode),
    );
  }, [episodes, selectedEpisode]);

  async function handleWatch(
    episode,
    preferredQuality = null,
    shouldAutoPlay = false,
  ) {
    setSelectedEpisode(episode);
    sourceRetryRef.current = new Set(
      [...sourceRetryRef.current].filter(
        (key) => !key.startsWith(`${episode.id}|`),
      ),
    );
    setLoadingStream(true);
    setError("");
    shouldAutoPlayRef.current = shouldAutoPlay;

    try {
      const preferredSource =
        preferredQuality && preferredQuality !== "auto"
          ? episode?.sources?.find(
              (source) => String(source.quality) === String(preferredQuality),
            )
          : null;
      const defaultSource =
        episode?.sources?.find((source) => source.isDefault) ||
        episode?.sources?.[0];
      const activeSource = preferredSource || defaultSource;
      const url =
        activeSource?.url ||
        episode.streamUrl ||
        (await fetchStream(seriesId, episode.episode, {
          vid: episode.vid,
          provider: detectedProvider,
        }));
      setStreamUrl(url);
      setQuality(
        activeSource ? String(activeSource.quality || "auto") : "auto",
      );
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
        ? selectedEpisode.sources.find((source) => source.isDefault) ||
          selectedEpisode.sources[0]
        : selectedEpisode.sources.find(
            (source) => String(source.quality) === String(nextQuality),
          );

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
    const currentIndex = episodes.findIndex(
      (episode) => episode.id === selectedEpisode.id,
    );
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
          ? selectedEpisode.sources.find(
              (source) => String(source.quality) === String(quality),
            )
          : selectedEpisode.sources.find((source) => source.isDefault) ||
            selectedEpisode.sources[0];
      if (!preferredSource) return [];

      const urls = [
        preferredSource.url,
        ...(preferredSource.backupUrls || []),
      ].filter(Boolean);
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
        const freshUrl = await fetchStream(seriesId, selectedEpisode.episode, {
          forceRefresh: true,
          vid: selectedEpisode?.vid,
          provider: detectedProvider,
        });
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

    const {
      addSymbol,
      resetSymbol,
      selectSymbol,
      setReadonlySymbol,
      setAutoSymbol,
    } = resolveQualityListSymbols(list);
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
            : sources.find(
                (source) => String(source.quality) === String(quality),
              ) ||
              sources.find((source) => source.isDefault) ||
              sources[0];

        const activeHeight = Number(activeSource?.quality) || 0;
        const activeQualityItem = list
          .toArray()
          .find((item) => Number(item.height) === activeHeight);
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
      node.removeEventListener(
        "media-quality-change-request",
        onQualityRequest,
      );
    };
  }, [quality, selectedEpisode, streamUrl]);

  return (
    <main className="wp-container">
      <header className="wp-header">
        <h2>{seriesDetail?.title || `Series ${seriesId}`}</h2>
        <Link className="wp-back-btn" to="/for-you">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Kembali
        </Link>
      </header>

      {error && (
        <p className="error-banner">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </p>
      )}
      {loadingDetail && <p className="muted">Memuat detail judul...</p>}

      <div className="wp-content">
        {seriesDetail ? (
          <section className="wp-detail-card">
            <div className="wp-detail-cover">
              {seriesDetail.poster ? (
                seriesDetail.source === "melolo" ? (
                  <HeicImage
                    src={seriesDetail.poster}
                    alt={seriesDetail.title}
                  />
                ) : (
                  <img
                    src={seriesDetail.poster}
                    alt={seriesDetail.title}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.classList.add("no-poster");
                    }}
                  />
                )
              ) : (
                <div className="poster-placeholder">
                  <span>🎬</span>
                </div>
              )}
            </div>
            <div className="wp-detail-body">
              <h3>{seriesDetail.title}</h3>

              {seriesDetail?.genres?.length ? (
                <div className="wp-tags">
                  {seriesDetail.genres.map((genre) => (
                    <span className="wp-tag" key={genre}>
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="wp-synopsis">
                {seriesDetail.synopsis || "Sinopsis belum tersedia."}
              </p>

              <div className="wp-meta">
                <span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {seriesDetail.rating || "-"}
                </span>
                <span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                  Total Episode:{" "}
                  {seriesDetail.totalEpisodes || episodes.length || "-"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="wp-player-section">
          {loadingStream ? (
            <p
              className="muted"
              style={{ padding: "2rem", textAlign: "center", color: "#888" }}
            >
              Menyiapkan stream...
            </p>
          ) : streamUrl ? (
            <>
              <media-player
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
                <media-outlet
                  key={`${selectedEpisode?.id || "idle"}:${(
                    selectedEpisode?.subtitles || []
                  )
                    .map((track) => track.url)
                    .join("|")}`}
                >
                  {(selectedEpisode?.subtitles || []).map((track, index) => (
                    <track
                      key={`${track.url}-${index}`}
                      src={subtitleTrackUrl(track.url)}
                      kind={track.kind || "subtitles"}
                      type="text/vtt"
                      label={track.label || `Subtitle ${index + 1}`}
                      srclang={track.lang || "id"}
                      default={Boolean(track.isDefault || index === 0)}
                    />
                  ))}
                </media-outlet>
                <media-community-skin />
              </media-player>
            </>
          ) : (
            <p
              className="muted"
              style={{ padding: "2rem", textAlign: "center", color: "#888" }}
            >
              Pilih episode untuk mulai menonton.
            </p>
          )}

          {selectedEpisode ? (
            <div className="wp-player-tools">
              <span>
                {canAutoNext ? "Auto-next aktif" : "Episode terakhir"}
              </span>
              <span style={{ opacity: 0.7 }}>
                {selectedEpisode.subtitles?.length
                  ? "Subtitle tersedia di player."
                  : "Subtitle tidak tersedia untuk episode ini."}
              </span>
            </div>
          ) : null}
        </section>

        <section className="wp-episodes-section">
          <h3>Eps</h3>
          {loadingEpisodes && !episodes.length ? (
            <p className="muted">Memuat episode...</p>
          ) : episodes.length ? (
            <div className="wp-episode-list">
              {episodes.map((episode) => (
                <button
                  key={episode.id}
                  className={
                    selectedEpisode?.id === episode.id
                      ? "wp-episode-btn active"
                      : "wp-episode-btn"
                  }
                  onClick={() => handleWatch(episode)}
                >
                  <span>Episode {episode.episode}</span>
                  <small>
                    {episode.duration ||
                      episode.title ||
                      `Eps ${episode.episode}`}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Episode belum tersedia.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default WatchPage;
