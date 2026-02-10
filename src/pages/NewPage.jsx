import { useCallback, useState } from "react";
import CatalogPage from "../components/CatalogPage";
import { fetchCatalog } from "../lib/apiClient";

function NewPage() {
  const [page, setPage] = useState(1);
  const loadCatalog = useCallback(() => fetchCatalog("new", page), [page]);

  return (
    <CatalogPage
      title={`Rilis Baru - Halaman ${page}`}
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

export default NewPage;
