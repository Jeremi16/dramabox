import { useNavigate } from "react-router-dom";

function CatalogPage({ title, items = [], controls }) {
  const navigate = useNavigate();

  function handleOpenSeries(series) {
    navigate(`/watch/${encodeURIComponent(series.id)}`, { state: { series } });
  }

  return (
    <main className="catalog-panel page-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {controls || null}
      </div>

      {items.length ? (
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
                {series.source && series.source !== "unknown" && (
                  <div className="source-badge" data-source={series.source}>
                    {series.source === "dramabox" ? (
                      <img src="/image/dramabox-logo.png" alt="DramaBox" />
                    ) : (
                      <img src="/image/melolo-logo.png" alt="Melolo" />
                    )}
                  </div>
                )}
              </div>
              <div className="series-card-content">
                <h3>{series.title}</h3>
                <p>{series.synopsis || "Tidak ada deskripsi."}</p>
                <div className="meta">
                  <span>Rating: {series.rating || "-"}</span>
                  <span>Ep: {series.totalEpisodes || "?"}</span>
                </div>
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
