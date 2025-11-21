import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ searchQuery, setSearchQuery, user, onLogout }) => {
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/search');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">BookRecs</span>
          </Link>
          
          <nav className="nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/top-selling" className="nav-link">Top Selling</Link>
            {user?.role !== 'admin' && (
              <Link to="/purchase-history" className="nav-link">My History</Link>
            )}
            <Link to="/about" className="nav-link">About</Link>
            <Link to="/contact" className="nav-link">Contact</Link>
            {user?.role !== 'admin' && (
              <Link to="/cart" className="nav-link">Cart</Link>
            )}
            {isAdmin && (
              <>
                <Link to="/admin/reported-comments" className="nav-link">Admin Panel</Link>
                <Link to="/admin/orders" className="nav-link">Orders</Link>
              </>
            )}
          </nav>

          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search books, authors, or genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </form>

          {user && (
            <div className="user-section">
              <div className="user-info">
                <span className="username">{user.username}</span>
                <span className={`user-role ${user.role}`}>
                  {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                </span>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
