import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import CatalogPage from "../components/CatalogPage";
import { searchCatalog } from "../lib/apiClient";

function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() || "";
  const loadCatalog = useCallback(() => {
    if (!query) return Promise.resolve([]);
    return searchCatalog(query);
  }, [query]);

  return (
    <CatalogPage
      title={query ? `Hasil Pencarian: "${query}"` : "Masukkan kata kunci pencarian"}
      loadCatalog={loadCatalog}
    />
  );
}

export default SearchPage;
