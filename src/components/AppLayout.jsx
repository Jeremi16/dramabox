import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

const FOLLOWING = ["Ayla", "Luna", "Hanson", "Nadya"];

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
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="brand-block">
            <p className="brand-badge">DramaBox</p>
            <h1>Stream</h1>
            <p className="brand-subtitle">Dashboard streaming modern ala cinema.</p>
          </div>

          <nav className="sidebar-nav">
            <NavLink className={({ isActive }) => (isActive ? "tab active" : "tab")} to="/for-you">
              For You
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "tab active" : "tab")} to="/new">
              Rilis Baru
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "tab active" : "tab")} to="/rank">
              Trending
            </NavLink>
          </nav>

          <section className="following-card">
            <h3>Following</h3>
            <div className="following-list">
              {FOLLOWING.map((name) => (
                <div key={name} className="following-item">
                  <span>{name.slice(0, 1)}</span>
                  <small>{name}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="main-area">
          <header className="topbar">
            <form className="search-form" onSubmit={handleSubmit}>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Cari judul drama..."
              />
              <button type="submit">Cari</button>
            </form>
            <div className="user-chip">JP</div>
          </header>

          <div className="content-area">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}

export default AppLayout;
