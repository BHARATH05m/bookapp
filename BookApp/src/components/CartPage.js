import React, { useEffect, useState } from 'react';
import { getCart, removeCartItem, checkoutCart } from '../services/cartService';
import UPIPayment from './UPIPayment';
import AddressForm from './AddressForm';
import './CartPage.css';

function CartPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [showUPIPayment, setShowUPIPayment] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // only 'upi'
  const [userAddress, setUserAddress] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await getCart(user.id);
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onRemove = async (itemId) => {
    await removeCartItem(itemId);
    await load();
  };

  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  const onCheckout = async (method = 'upi') => {
    setPaymentMethod(method);
    setShowAddressForm(true);
  };

  const handleAddressSubmit = async (addressData) => {
    setUserAddress(addressData);
    setShowAddressForm(false);
    
    // UPI-only flow
    setShowUPIPayment(true);
  };

  const handleAddressCancel = () => {
    setShowAddressForm(false);
    setPaymentMethod('');
    setUserAddress(null);
  };

  const handleUPIPaymentSuccess = async (transactionId) => {
    try {
      setShowUPIPayment(false);
      setCheckedOut(true);
      // Order is already completed by payments verification endpoint
      alert(`Payment successful! Transaction ID: ${transactionId}`);
      await load();
    } catch (error) {
      console.error('Payment success error:', error);
      alert('Payment verified, but refreshing cart failed. Please reload the page.');
    }
  };

  const handleUPIPaymentCancel = () => {
    setShowUPIPayment(false);
    setPaymentMethod('');
    setUserAddress(null);
  };

  return (
    <div className="container cart-page">
      <div className="cart-header">
        <h2>My Cart</h2>
      </div>
      {checkedOut && (
        <div className="checkout-success">Thanks for buying! Your order has been placed and cart cleared.</div>
      )}
      {loading && <p>Loading cart...</p>}
      {!loading && items.length === 0 && (
        <div className="empty">Your cart is empty.</div>
      )}
      {items.map((it) => {
        console.log('Cart item:', { title: it.title, imageUrl: it.imageUrl });
        return (
        <div key={it._id} className="cart-card">
          <div className="cart-cover">
            {it.imageUrl ? (
              <img src={it.imageUrl} alt={it.title} />
            ) : (
              <span>📘</span>
            )}
          </div>
          <div className="cart-info">
            <h3 className="cart-title">{it.title}</h3>
            <p className="cart-author">{it.author}</p>
          </div>
          <div className="cart-actions">
            <span className="cart-price">${Number(it.price).toFixed(2)}</span>
            <button onClick={() => onRemove(it._id)} className="remove-btn">Remove</button>
          </div>
        </div>
        );
      })}
      {items.length > 0 && (
        <div className="cart-summary">
          <span className="summary-total">Total: ${total.toFixed(2)}</span>
          <div className="checkout-options">
            <button 
              className="checkout-btn upi-btn" 
              onClick={() => onCheckout('upi')}
            >
              Pay with UPI
            </button>
          </div>
        </div>
      )}
      
      {showAddressForm && (
        <AddressForm
          totalAmount={total}
          paymentMethod={paymentMethod}
          onAddressSubmit={handleAddressSubmit}
          onCancel={handleAddressCancel}
        />
      )}
      
      {showUPIPayment && (
        <UPIPayment
          totalAmount={total}
          addressData={userAddress}
          onPaymentSuccess={handleUPIPaymentSuccess}
          onPaymentCancel={handleUPIPaymentCancel}
        />
      )}
    </div>
  );
}

export default CartPage;


