import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CatalogPage({ title, loadCatalog, controls }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const result = await loadCatalog();
        if (!cancelled) setItems(result);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Gagal memuat data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [loadCatalog]);

  function handleOpenSeries(series) {
    navigate(`/watch/${encodeURIComponent(series.id)}`, { state: { series } });
  }

  return (
    <main className="catalog-panel page-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {controls || null}
      </div>

      {error && <p className="error-banner">{error}</p>}

      {loading ? (
        <p className="muted">Memuat daftar drama...</p>
      ) : items.length ? (
        <div className="card-grid">
          {items.map((series) => (
            <article
              key={series.id}
              className="series-card"
              onClick={() => handleOpenSeries(series)}
            >
              <div className="poster-wrap">
                {series.poster ? (
                  <img src={series.poster} alt={series.title} loading="lazy" />
                ) : null}
              </div>
              <h3>{series.title}</h3>
              <p>{series.synopsis || "Tidak ada deskripsi."}</p>
              <div className="meta">
                <span>Rating: {series.rating || "-"}</span>
                <span>Ep: {series.totalEpisodes || "?"}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Tidak ada data drama.</p>
      )}
    </main>
  );
}

export default CatalogPage;
