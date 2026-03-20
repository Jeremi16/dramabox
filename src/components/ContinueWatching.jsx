import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllWatchHistory, removeWatchHistory } from "../utils/watchHistory";
import "./ContinueWatching.css";

export function ContinueWatching() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await getAllWatchHistory();
      setHistory(data.slice(0, 10)); // Show max 10 items
    } catch (err) {
      console.error("Failed to load watch history:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(seriesId, e) {
    e.stopPropagation();
    try {
      await removeWatchHistory(seriesId);
      setHistory(prev => prev.filter(item => item.seriesId !== seriesId));
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  }

  function handleContinue(item) {
    navigate(`/watch/${encodeURIComponent(item.seriesId)}`);
  }

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <div className="continue-watching">
      <h2>Lanjutkan Menonton</h2>
      <div className="continue-grid">
        {history.map((item) => (
          <div 
            key={item.seriesId} 
            className="continue-card"
            onClick={() => handleContinue(item)}
          >
            {item.poster && (
              <img src={item.poster} alt={item.title} loading="lazy" />
            )}
            <div className="continue-info">
              <h3>{item.title || "Unknown"}</h3>
              <p>Episode {item.episodeNumber}</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min(100, (item.progress / 1800) * 100)}%` }}
                />
              </div>
            </div>
            <button 
              className="remove-btn"
              onClick={(e) => handleRemove(item.seriesId, e)}
              title="Hapus"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
