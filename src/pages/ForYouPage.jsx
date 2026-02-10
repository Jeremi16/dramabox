import { useCallback, useState } from "react";
import CatalogPage from "../components/CatalogPage";
import { fetchCatalog } from "../lib/apiClient";

function ForYouPage() {
  const [page, setPage] = useState(1);
  const loadCatalog = useCallback(() => fetchCatalog("foryou", page), [page]);

  return (
    <CatalogPage
      title={`For You - Halaman ${page}`}
      loadCatalog={loadCatalog}
      controls={
        <div className="page-controls">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</button>
          <span>Hal. {page}</span>
          <button onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      }
    />
  );
}

export default ForYouPage;
