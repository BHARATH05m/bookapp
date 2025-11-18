import React, { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import './AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersData = await getAllOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
        alert('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      // Refresh list
      setLoading(true);
      const refreshed = await getAllOrders();
      setOrders(refreshed);
    } catch (e) {
      console.error('Failed to update order status', e);
      alert('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container admin-orders">
      <h1>User Orders</h1>
      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Books Bought</th>
              <th>Total Amount</th>
              <th>Order Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-orders">No orders found</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id}>
                  <td className="username-cell">
                    <strong>{order.userId?.username || 'Unknown User'}</strong>
                  </td>
                  <td className="books-cell">
                    <div className="books-list">
                      {order.items.map((item, index) => (
                        <div key={index} className="book-item">
                          <div className="book-cover-small">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} />
                            ) : (
                              <span>📘</span>
                            )}
                          </div>
                          <div className="book-details">
                            <div className="book-title">{item.title}</div>
                            <div className="book-author">by {item.author}</div>
                            <div className="book-price">₹{item.price.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="total-cell">
                    <strong>₹{order.totalAmount.toFixed(2)}</strong>
                  </td>
                  <td className="date-cell">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge ${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="payment-cell">
                    <div><strong>Method:</strong> {order.paymentMethod || 'n/a'}</div>
                    <div><strong>Status:</strong> {order.paymentStatus || 'n/a'}</div>
                    {order.transactionId ? (
                      <div><strong>Txn:</strong> {order.transactionId}</div>
                    ) : null}
                  </td>
                  <td className="actions-cell">
                    <button
                      disabled={order.status === 'completed'}
                      onClick={() => handleUpdateStatus(order._id, 'completed')}
                    >
                      Confirm
                    </button>
                    <button
                      disabled={order.status === 'cancelled'}
                      onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                      style={{ marginLeft: 8 }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
