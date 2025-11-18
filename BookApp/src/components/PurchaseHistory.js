import React, { useState, useEffect } from 'react';
import { getGoogleVolumeById } from '../services/googleBooksService';
import api from '../services/api';
import './PurchaseHistory.css';

const PurchaseHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'stats'

  useEffect(() => {
    // Test API connection first
    testAPIConnection();
    fetchPurchaseHistory();
    fetchPurchaseStats();
  }, []);

  const testAPIConnection = async () => {
    try {
      console.log('Testing API connection...');
      const token = localStorage.getItem('token');
      console.log('Auth token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
      
      // Test basic API connection first (backend exposes /api/health)
      console.log('Testing basic API connection...');
      const basicResponse = await api.get('/health');
      console.log('Basic API health response:', basicResponse.data);
      
      // Test purchases route
      console.log('Testing purchases route...');
      const response = await api.get('/purchases/test');
      console.log('API test response:', response.data);
    } catch (error) {
      console.error('API connection test failed:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Full error:', error);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      setLoading(true);
      console.log('Fetching purchase history...');
      const response = await api.get('/purchases/history');
      console.log('Purchase history response:', response.data);
      
      if (response.data.history && response.data.history.length > 0) {
        // Fetch book covers for each purchase
        const historyWithCovers = await Promise.all(
          response.data.history.map(async (dayGroup) => {
            const purchasesWithCovers = await Promise.all(
              dayGroup.purchases.map(async (purchase) => {
                try {
                  const googleBook = await getGoogleVolumeById(purchase.bookId);
                  return {
                    ...purchase,
                    imageUrl: googleBook?.imageUrl || ''
                  };
                } catch (error) {
                  console.warn(`Could not fetch cover for book ${purchase.bookId}:`, error);
                  return {
                    ...purchase,
                    imageUrl: ''
                  };
                }
              })
            );
            return {
              ...dayGroup,
              purchases: purchasesWithCovers
            };
          })
        );
        setHistory(historyWithCovers);
      } else {
        console.log('No purchase history found');
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError(`Failed to load purchase history: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseStats = async () => {
    try {
      console.log('Fetching purchase stats...');
      const response = await api.get('/purchases/stats');
      console.log('Purchase stats response:', response.data);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching purchase stats:', error);
      console.error('Stats error details:', error.response?.data || error.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return `₹${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="purchase-history-container">
        <h2>My Purchase History</h2>
        <div className="loading">Loading your purchase history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="purchase-history-container">
        <h2>My Purchase History</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="purchase-history-container">
      <div className="purchase-history-header">
        <h2>My Purchase History</h2>
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Purchase History
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
        </div>
      </div>

      {activeTab === 'history' && (
        <div className="history-content">
          {history.length === 0 ? (
            <div className="no-purchases">
              <div className="no-purchases-icon">📚</div>
              <h3>No purchases yet</h3>
              <p>Start exploring our collection and make your first purchase!</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((dayGroup, index) => (
                <div key={index} className="day-group">
                  <div className="day-header">
                    <h3>{formatDate(dayGroup.date)}</h3>
                    <span className="purchase-count">
                      {dayGroup.purchases.length} item{dayGroup.purchases.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="purchases-list">
                    {dayGroup.purchases.map((purchase, purchaseIndex) => (
                      <div key={purchase._id} className="purchase-item">
                        <div className="purchase-cover">
                          {purchase.imageUrl ? (
                            <img src={purchase.imageUrl} alt={purchase.title} />
                          ) : (
                            <div className="no-cover">📖</div>
                          )}
                        </div>
                        
                        <div className="purchase-details">
                          <h4 className="purchase-title">{purchase.title}</h4>
                          <p className="purchase-author">by {purchase.author}</p>
                          <div className="purchase-meta">
                            <span className="purchase-price">{formatPrice(purchase.price)}</span>
                            <span className="purchase-quantity">Qty: {purchase.quantity}</span>
                            <span className="purchase-time">
                              {new Date(purchase.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="purchase-total">
                          {formatPrice(purchase.price * purchase.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="stats-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-info">
                <h3>{stats.totalPurchases}</h3>
                <p>Total Books Purchased</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>{formatPrice(stats.totalSpent)}</h3>
                <p>Total Amount Spent</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">👤</div>
              <div className="stat-info">
                <h3>{stats.favoriteAuthor}</h3>
                <p>Favorite Author</p>
              </div>
            </div>
          </div>
          
          {stats.monthlyStats && stats.monthlyStats.length > 0 && (
            <div className="monthly-stats">
              <h3>Monthly Activity (Last 6 Months)</h3>
              <div className="monthly-chart">
                {stats.monthlyStats.map((month, index) => (
                  <div key={index} className="month-bar">
                    <div className="month-label">
                      {new Date(month._id.year, month._id.month - 1).toLocaleDateString('en-US', {
                        month: 'short',
                        year: '2-digit'
                      })}
                    </div>
                    <div className="month-data">
                      <div className="month-books">{month.count} books</div>
                      <div className="month-amount">{formatPrice(month.totalSpent)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
