import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

function AppLayout() {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    if (!searchValue.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
  }

  return (
    <div className="app-shell">
      <header className="top-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <span className="brand-logo">🎬</span>
            <div className="brand-text">
              <h1>DramaBox</h1>
              <span className="brand-badge">Lite</span>
            </div>
          </div>

          <nav className="navbar-nav">
            <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/for-you">
              For You
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/new">
              Rilis Baru
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/rank">
              Trending
            </NavLink>
          </nav>

          <div className="navbar-actions">
            <form className="search-form" onSubmit={handleSubmit}>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Cari drama..."
              />
              <button type="submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </form>
            <div className="user-chip">JP</div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
