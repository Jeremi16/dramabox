import { useCallback, useState } from "react";
import CatalogPage from "../components/CatalogPage";
import { fetchCatalog } from "../lib/apiClient";

function RankPage() {
  const [page, setPage] = useState(1);
  const [rankType, setRankType] = useState("day");
  const loadCatalog = useCallback(() => fetchCatalog("rank", page, { type: rankType }), [page, rankType]);

  return (
    <CatalogPage
      title={`Rank (${rankType}) - Halaman ${page}`}
      loadCatalog={loadCatalog}
      controls={
        <div className="panel-control-wrap">
          <div className="tabs rank-switch">
            {["day", "week", "month"].map((type) => (
              <button
                key={type}
                className={rankType === type ? "tab active" : "tab"}
                onClick={() => {
                  setPage(1);
                  setRankType(type);
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="page-controls">
            <button onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</button>
            <span>Hal. {page}</span>
            <button onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      }
    />
  );
}

export default RankPage;
