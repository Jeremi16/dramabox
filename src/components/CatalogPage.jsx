import { useNavigate } from "react-router-dom";
import HeicImage from "./HeicImage";

function CatalogPage({ title, items = [], controls }) {
  const navigate = useNavigate();

  function handleOpenSeries(series) {
    // Simpan data series lengkap di localStorage untuk referensi saat refresh
    try {
      const seriesCache = JSON.parse(
        localStorage.getItem("seriesCache") || "{}",
      );
      seriesCache[series.id] = series;
      localStorage.setItem("seriesCache", JSON.stringify(seriesCache));

      // Simpan juga source mapping (untuk backward compatibility)
      const sourceMap = JSON.parse(
        localStorage.getItem("seriesSourceMap") || "{}",
      );
      sourceMap[series.id] = series.source;
      localStorage.setItem("seriesSourceMap", JSON.stringify(sourceMap));
    } catch (e) {
      // Ignore storage error
    }
    // Navigasi dengan provider di URL: /watch/dramabox/:id atau /watch/melolo/:id
    const provider = series.source === "melolo" ? "melolo" : "dramabox";
    navigate(`/watch/${provider}/${encodeURIComponent(series.id)}`, {
      state: { series },
    });
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
                {series.source === "melolo" ? (
                  <HeicImage
                    src={series.poster}
                    alt={series.title}
                    loading="lazy"
                  />
                ) : (
                  <img
                    src={series.poster || ""}
                    alt={series.title}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.classList.add("no-poster");
                    }}
                  />
                )}
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
