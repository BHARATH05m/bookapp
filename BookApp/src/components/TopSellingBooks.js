import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoogleVolumeById } from '../services/googleBooksService';
import { addToCart } from '../services/cartService';
import api from '../services/api';
import './TopSellingBooks.css';

const TopSellingBooks = () => {
  const [topSellingBooks, setTopSellingBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopSellingBooks();
  }, []);

  const fetchTopSellingBooks = async () => {
    try {
      const response = await api.get('/reports/top-selling');
      if (response.data.books && response.data.books.length > 0) {
        // Fetch book details/covers from Google Books API
        const booksWithCovers = await Promise.all(
          response.data.books.map(async (book) => {
            try {
              const googleBook = await getGoogleVolumeById(book.bookId);
              return {
                ...book,
                ...googleBook,
                imageUrl: googleBook?.imageUrl || ''
              };
            } catch (error) {
              console.warn(`Could not fetch cover for book ${book.bookId}:`, error);
              return { ...book, imageUrl: '' };
            }
          })
        );
        setTopSellingBooks(booksWithCovers);
      } else {
        setTopSellingBooks([]);
      }
    } catch (error) {
      console.error('Error fetching top-selling books:', error);
      setError('Failed to load top-selling books');
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleAddToCart = async (book) => {
    try {
      setAddingId(book.bookId);
      await addToCart({
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        price: Number(book.price) || 50,
        imageUrl: book.imageUrl || ''
      });
    } catch (e) {
      console.error('Failed to add to cart from Top Selling:', e);
      alert('Failed to add to cart. Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  const handleBuyNow = async (book) => {
    await handleAddToCart(book);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="top-selling-container">
        <h2>Top Selling Books This Month</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-selling-container">
        <h2>Top Selling Books This Month</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (topSellingBooks.length === 0) {
    return (
      <div className="top-selling-container">
        <h2>Top Selling Books This Month</h2>
        <div className="no-books">No books sold this month</div>
      </div>
    );
  }

  return (
    <div className="top-selling-container">
      <h2>Top Selling Books This Month</h2>
      <div className="books-grid">
        {topSellingBooks.map((book, index) => (
          <div key={book.bookId} className="book-card">
            <div className="book-rank">#{index + 1}</div>
            <div className="book-cover">
              {book.imageUrl ? (
                <img src={book.imageUrl} alt={book.title} />
              ) : (
                <div className="no-cover">No Cover</div>
              )}
            </div>
            <div className="book-info">
              <h3 className="book-title">{book.title}</h3>
              <p className="book-author">by {book.author}</p>
              <div className="sales-info">
                <span className="total-sold">{book.totalSold} sold</span>
              </div>
              <div className="actions">
                <button
                  className="btn add-btn"
                  onClick={() => handleAddToCart(book)}
                  disabled={addingId === book.bookId}
                >
                  {addingId === book.bookId ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  className="btn buy-btn"
                  onClick={() => handleBuyNow(book)}
                  disabled={addingId === book.bookId}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopSellingBooks;
