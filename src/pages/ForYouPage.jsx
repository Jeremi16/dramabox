import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCatalog } from "../lib/apiClient";
import { GridSkeleton } from "../components/skeletons/Skeleton";
import { ContinueWatching } from "../components/ContinueWatching";
import CatalogPage from "../components/CatalogPage";

function ForYouPage() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["catalog", "foryou", "infinite"],
    queryFn: ({ pageParam = 1 }) => fetchCatalog("foryou", pageParam),
    getNextPageParam: (lastPage, pages) => {
      // Jika halaman terakhir memiliki data, lanjut ke halaman berikutnya
      return lastPage.length > 0 ? pages.length + 1 : undefined;
    },
  });

  // Flatten semua pages menjadi satu array
  const items = data?.pages?.flat() ?? [];

  // Ref untuk observer
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Setup Intersection Observer
  const handleObserver = useCallback(
    (entries) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
            }}
          >
            😕
          </div>
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "700",
              color: "var(--text-primary)",
            }}
          >
            Gagal memuat data
          </h2>
          <p
            style={{
              margin: "0 0 20px 0",
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
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
              fontFamily: "inherit",
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
          <h1
            style={{
              padding: "0 0 16px 0",
              margin: "0 0 24px 0",
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--text-primary)",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
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
      <CatalogPage title="For You" items={items} />
      {/* Load More Observer */}
      <div
        ref={loadMoreRef}
        style={{
          padding: "24px",
          textAlign: "center",
          minHeight: "60px",
        }}
      >
        {isFetchingNextPage && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid var(--border-light)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            Memuat lebih banyak...
          </div>
        )}
        {!hasNextPage && items.length > 0 && (
          <span
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            Tidak ada data lagi
          </span>
        )}
      </div>
    </>
  );
}

export default ForYouPage;
