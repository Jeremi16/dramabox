import { useEffect, useRef } from "react";
import { saveWatchProgress, getWatchProgress } from "../utils/watchHistory";

export function useContinueWatching(seriesId, episodeNumber, seriesData, playerRef) {
  const saveTimerRef = useRef(null);

  // Load saved progress on mount
  useEffect(() => {
    if (!seriesId || !playerRef.current) return;

    async function loadProgress() {
      try {
        const saved = await getWatchProgress(seriesId);
        if (saved && saved.episodeNumber === episodeNumber && saved.progress > 10) {
          // Only restore if same episode and progress > 10 seconds
          if (playerRef.current && typeof playerRef.current.currentTime === "number") {
            playerRef.current.currentTime = saved.progress;
          }
        }
      } catch (err) {
        console.error("Failed to load watch progress:", err);
      }
    }

    loadProgress();
  }, [seriesId, episodeNumber, playerRef]);

  // Save progress periodically
  useEffect(() => {
    if (!seriesId || !episodeNumber || !playerRef.current) return;

    const saveProgress = async () => {
      try {
        const currentTime = playerRef.current?.currentTime ?? 0;
        const duration = playerRef.current?.duration ?? 0;
        
        // Don't save if near the end (last 30 seconds)
        if (duration > 0 && currentTime > 10 && currentTime < duration - 30) {
          await saveWatchProgress(seriesId, episodeNumber, currentTime, seriesData);
        }
      } catch (err) {
        console.error("Failed to save watch progress:", err);
      }
    };

    // Save every 10 seconds
    saveTimerRef.current = setInterval(saveProgress, 10000);

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveProgress(); // Save one last time on unmount
      }
    };
  }, [seriesId, episodeNumber, seriesData, playerRef]);
}
