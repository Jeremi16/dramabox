import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fetchEpisodes, fetchSeriesDetail, fetchStream } from "../lib/apiClient";

function qualityLabel(source) {
  if (!source?.quality) return "Auto";
  return `${source.quality}p`;
}

function WatchPage() {
  const { seriesId } = useParams();
  const location = useLocation();
  const series = useMemo(() => location.state?.series || null, [location.state]);
  const playerRef = useRef(null);
  const shouldAutoPlayRef = useRef(false);
  const refreshRetryRef = useRef(new Set());
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

  const qualityOptions = useMemo(() => {
    if (!selectedEpisode?.sources?.length) return [];
    return selectedEpisode.sources;
  }, [selectedEpisode]);

  const canAutoNext = useMemo(() => {
    if (!selectedEpisode) return false;
    return episodes.some((episode) => Number(episode.episode) > Number(selectedEpisode.episode));
  }, [episodes, selectedEpisode]);

  async function handleWatch(episode, preferredQuality = null, shouldAutoPlay = false) {
    setSelectedEpisode(episode);
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

  function handleQualityChange(event) {
    const nextQuality = event.target.value;
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
      return;
    } catch {
      // Fallback untuk browser yang memblok autoplay bersuara.
    }

    const previousMuted = Boolean(node.muted);
    node.muted = true;
    try {
      await node.play?.();
      if (!previousMuted) {
        setTimeout(() => {
          if (playerRef.current) playerRef.current.muted = false;
        }, 250);
      }
    } catch {
      // Biarkan user menekan play manual jika policy browser sangat ketat.
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

    async function handleStreamError() {
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
  }, [selectedEpisode, seriesId, streamUrl]);

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
              ref={playerRef}
              class="vds-player"
              src={streamUrl}
              poster={seriesDetail?.poster || ""}
              title={seriesDetail?.title || `Series ${seriesId}`}
              crossorigin
              playsinline
            >
              <media-outlet />
              <media-community-skin />
            </media-player>
            {selectedEpisode ? (
              <div className="player-quality-overlay">
                <label>
                  <span>Quality</span>
                  <select value={quality} onChange={handleQualityChange} disabled={!qualityOptions.length}>
                    <option value="auto">Auto</option>
                    {qualityOptions.map((source) => (
                      <option key={`${source.quality}-${source.url}`} value={String(source.quality)}>
                        {qualityLabel(source)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted">Pilih episode untuk mulai menonton.</p>
        )}
      </div>

      {selectedEpisode ? (
        <div className="player-tools">
          <small>{canAutoNext ? "Auto-next aktif" : "Episode terakhir"}</small>
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
