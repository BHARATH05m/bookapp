import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './FavoriteGenre.css';
import { allowedGenres } from '../constants/genres';

const GENRES = allowedGenres;

const FavoriteGenre = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (genre) => {
    setError('');
    setSelected((prev) => {
      const exists = prev.includes(genre);
      if (exists) return prev.filter(g => g !== genre);
      if (prev.length >= 5) {
        setError('You can select up to 5 genres');
        return prev;
      }
      return [...prev, genre];
    });
  };

  const handleSave = async () => {
    if (!selected.length) {
      setError('Select at least one genre to continue');
      return;
    }
    try {
      setSaving(true);
      setError('');
      // Use shared axios client; it attaches Authorization header automatically
      const { data } = await api.put('/auth/profile', { favoriteGenres: selected });

      // Update user in localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...user, favoriteGenres: selected };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Force reload so App reads updated localStorage and stops gating
      window.location.replace('/');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="genre-container">
      <div className="genre-card">
        <h2>Next, select your favorite genres.</h2>
        <p>We use your favorite genres to make better book recommendations.</p>
        {error && <div className="error-message">{error}</div>}
        <div className="genre-grid">
          {GENRES.map((g) => (
            <button
              key={g}
              className={`genre-item ${selected.includes(g) ? 'selected' : ''}`}
              onClick={() => toggle(g)}
              type="button"
            >
              {g}
            </button>
          ))}
        </div>
        <div className="genre-actions">
          <button className="submit-btn" onClick={handleSave} disabled={saving || selected.length === 0}>
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FavoriteGenre;


