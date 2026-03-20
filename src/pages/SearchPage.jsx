import { useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useQueries";
import { GridSkeleton } from "../components/skeletons/Skeleton";
import CatalogPage from "../components/CatalogPage";

function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() || "";
  const { data: items = [], isLoading, error } = useSearch(query);

  if (!query) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "400px",
        padding: "24px"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <h2 style={{
            margin: "0",
            fontSize: "18px",
            fontWeight: "700",
            color: "var(--text-primary)"
          }}>
            Masukkan kata kunci pencarian
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    // Handle different error formats
    let errorMessage = "Terjadi kesalahan saat mencari";
    
    if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.message && typeof error.message === "string") {
      errorMessage = error.message;
    } else if (error?.error && typeof error.error === "string") {
      errorMessage = error.error;
    } else if (error?.data?.message) {
      errorMessage = error.data.message;
    }

    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "400px",
        padding: "24px"
      }}>
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>😕</div>
          <h2 style={{
            margin: "0 0 8px 0",
            fontSize: "18px",
            fontWeight: "700",
            color: "var(--text-primary)"
          }}>
            Gagal mencari
          </h2>
          <p style={{
            margin: "0 0 20px 0",
            color: "var(--text-secondary)",
            fontSize: "14px"
          }}>
            {errorMessage}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 style={{ 
          padding: "0 0 16px 0", 
          margin: "0 0 24px 0",
          fontSize: "20px",
          fontWeight: "700",
          color: "var(--text-primary)",
          borderBottom: "1px solid var(--border-light)"
        }}>
          Hasil Pencarian: "{query}"
        </h1>
        <GridSkeleton count={12} />
      </div>
    );
  }

  return (
    <CatalogPage
      title={`Hasil Pencarian: "${query}"`}
      items={items}
    />
  );
}

export default SearchPage;
