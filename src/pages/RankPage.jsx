import { useState } from "react";
import { useCatalog } from "../hooks/useQueries";
import { GridSkeleton } from "../components/skeletons/Skeleton";
import CatalogPage from "../components/CatalogPage";

function RankPage() {
  const [page, setPage] = useState(1);
  const { data: items = [], isLoading, error } = useCatalog("rank", page);

  if (error) {
    // Handle different error formats
    let errorMessage = "Terjadi kesalahan saat memuat data";
    
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
        <div style={{ 
          maxWidth: "400px", 
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "16px"
          }}>
            😕
          </div>
          <h2 style={{
            margin: "0 0 8px 0",
            fontSize: "18px",
            fontWeight: "700",
            color: "var(--text-primary)"
          }}>
            Gagal memuat data
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
        <h1 style={{ padding: "1rem" }}>Rank - Halaman {page}</h1>
        <GridSkeleton count={12} />
      </div>
    );
  }

  return (
    <CatalogPage
      title={`Rank - Halaman ${page}`}
      items={items}
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

export default RankPage;
