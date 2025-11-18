const backendBase =
  process.env.REACT_APP_BACKEND_URL ||
  (typeof window !== 'undefined' && window.__BACKEND_URL__) ||
  'http://localhost:5001';

const API_BASE_URL = `${backendBase}/api`;

export const reviewService = {
  // Get reviews for a Google Books volumeId
  async getReviewsByBook(bookId, page = 1, limit = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${bookId}`);
      const data = await response.json();
      // Backend returns { reviews: [...] }
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      return { success: true, comments: reviews, total: reviews.length };
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return { success: false, comments: [], total: 0 };
    }
  },

  // Add or update a review (upsert) for a volumeId
  async addReview(bookId, rating, comment) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      const data = await response.json();
      // Normalize to { success, comment }
      return { success: response.ok, comment: data.review, message: data.message };
    } catch (error) {
      console.error('Error adding review:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // Update review (no dedicated endpoint; use POST upsert)
  async updateReview(bookId, rating, comment) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      const data = await response.json();
      return { success: response.ok, comment: data.review, message: data.message };
    } catch (error) {
      console.error('Error updating review:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // Unsupported operations mirrored for API parity
  async deleteReview(bookId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error('Error deleting review:', error);
      return { success: false, message: 'Network error' };
    }
  },

  async reportReview(reviewId, reportReason, reportDescription) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reportReason, reportDescription })
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error('Error reporting review:', error);
      return { success: false, message: 'Network error' };
    }
  },

  async getReportedReviews(page = 1, limit = 10) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/admin/reported?page=${page}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching reported reviews:', error);
      return { success: false, reviews: [], total: 0 };
    }
  },

  async dismissReviewReport(reviewId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/dismiss-report`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error dismissing review report:', error);
      return { success: false, message: 'Network error' };
    }
  }
  ,

  async adminDeleteReview(reviewId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reviews/admin/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error('Error deleting review (admin):', error);
      return { success: false, message: 'Network error' };
    }
  }
};

// Backward-compatible helpers similar to earlier examples
export const submitReview = async (bookId, { rating, comment }) => {
  const res = await reviewService.addReview(bookId, rating, comment);
  return res.comment;
};

export const fetchReviews = async (bookId) => {
  const res = await reviewService.getReviewsByBook(bookId);
  return res.comments;
};


