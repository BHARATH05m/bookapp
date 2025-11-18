import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('No authentication token found. Please log in again.');
        return;
      }
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });

      // Use same backend base URL/port as the rest of the app (defaults to 5001)
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/auth/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          if (currentPage === 1) {
            setUsers(result.users);
          } else {
            setUsers(prev => [...prev, ...result.users]);
          }
          setTotalPages(result.pagination.totalPages);
          setTotalUsers(result.pagination.totalUsers);
          setHasMore(result.pagination.hasMore);
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to fetch users'}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(`Network Error: ${error.message}`);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchLoading(true);
    setCurrentPage(1);
    setUsers([]);
    fetchUsers();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const refreshUsers = () => {
    setCurrentPage(1);
    setUsers([]);
    setSearchTerm('');
    fetchUsers();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    return role === 'admin' ? 'admin-badge' : 'user-badge';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="user-management">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <button 
          className="btn btn-primary"
          onClick={refreshUsers}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="user-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Admins</h3>
          <p className="stat-number">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="stat-card">
          <h3>Regular Users</h3>
          <p className="stat-number">{users.filter(u => u.role === 'user').length}</p>
        </div>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <button 
            type="submit" 
            className="btn btn-secondary"
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="users-list">
        {loading && users.length === 0 ? (
          <div className="loading">
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="no-users">
            <p>No users found.</p>
          </div>
        ) : (
          <>
            <div className="users-table">
              <div className="table-header">
                <div className="col-username">Username</div>
                <div className="col-email">Email</div>
                <div className="col-role">Role</div>
                <div className="col-created">Created</div>
              </div>
              {users.map((userData) => (
                <div key={userData._id} className="user-row">
                  <div className="col-username">
                    <span className="username">{userData.username}</span>
                  </div>
                  <div className="col-email">
                    <span className="email">{userData.email}</span>
                  </div>
                  <div className="col-role">
                    <span className={`role-badge ${getRoleBadge(userData.role)}`}>
                      {userData.role}
                    </span>
                  </div>
                  <div className="col-created">
                    <span className="created-date">{formatDate(userData.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="load-more">
                <button 
                  className="btn btn-outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
