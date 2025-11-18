import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';
import SearchResults from './components/SearchResults';
import BookDetail from './components/BookDetail';
import Login from './components/Login';
import AddBook from './components/AddBook';
import EditBook from './components/EditBook';
import AdminPanel from './components/AdminPanel';
import AdminOrders from './components/AdminOrders';
import FavoriteGenre from './components/FavoriteGenre';
import About from './components/About';
import Contact from './components/Contact';
import TopSellingBooks from './components/TopSellingBooks';
import PurchaseHistory from './components/PurchaseHistory';
import './App.css';
import CartPage from './components/CartPage';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) setUser(JSON.parse(userData));
    setLoading(false);
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Login onLogin={handleLogin} />
      </Router>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <Router>
      <div className="App">
        <Header 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          user={user}
          onLogout={handleLogout}
        />
        <main>
          <Routes future={{ v7_relativeSplatPath: true }}>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/search" element={<SearchResults searchQuery={searchQuery} />} />
            <Route path="/book/:bookId" element={<BookDetail user={user} />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/top-selling" element={<TopSellingBooks />} />
            <Route path="/purchase-history" element={!isAdmin ? <PurchaseHistory /> : <Navigate to="/" replace />} />
            <Route path="/edit-book/:bookId" element={isAdmin ? <EditBook /> : <Navigate to="/" replace />} />
            <Route path="/admin/add-book" element={isAdmin ? <AddBook /> : <Navigate to="/" replace />} />
            <Route path="/admin/reported-comments" element={isAdmin ? <AdminPanel user={user} /> : <Navigate to="/" replace />} />
            <Route path="/admin/orders" element={isAdmin ? <AdminOrders /> : <Navigate to="/" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/choose-genre" element={!isAdmin ? <FavoriteGenre /> : <Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
