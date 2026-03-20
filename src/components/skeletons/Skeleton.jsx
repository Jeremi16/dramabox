import "./Skeleton.css";

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-poster" />
      <div className="skeleton-title" />
      <div className="skeleton-text" />
    </div>
  );
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="skeleton-detail">
      <div className="skeleton-poster-large" />
      <div className="skeleton-info">
        <div className="skeleton-title-large" />
        <div className="skeleton-text" />
        <div className="skeleton-text" />
        <div className="skeleton-text" />
      </div>
    </div>
  );
}
