import { useCatalog } from "../hooks/useQueries";
import { GridSkeleton } from "../components/skeletons/Skeleton";
import { ContinueWatching } from "../components/ContinueWatching";
import CatalogPage from "../components/CatalogPage";

function ForYouPage() {
  const { data: items = [], isLoading, error } = useCatalog("foryou", 1);

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
      <>
        <ContinueWatching />
        <div>
          <h1 style={{ 
            padding: "0 0 16px 0", 
            margin: "0 0 24px 0",
            fontSize: "20px",
            fontWeight: "700",
            color: "var(--text-primary)",
            borderBottom: "1px solid var(--border-light)"
          }}>
            For You
          </h1>
          <GridSkeleton count={12} />
        </div>
      </>
    );
  }

  return (
    <>
      <ContinueWatching />
      <CatalogPage
        title="For You"
        items={items}
      />
    </>
  );
}

export default ForYouPage;
