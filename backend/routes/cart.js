const express = require('express');
const mongoose = require('mongoose');
const CartItem = require('../models/CartItem');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Add to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = (req.user && req.user._id) || req.body.userId;
    const { bookId, title, price, author = '', imageUrl = '' } = req.body;

    if (!userId || !bookId || !title || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: userId, bookId, title, price' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    if (typeof price !== 'number') {
      return res.status(400).json({ error: 'Price must be a number' });
    }

    const filter = { userId, bookId };
    const update = {
      $setOnInsert: {
        title,
        author,
        price,
        imageUrl,
        purchased: false,
        createdAt: new Date()
      }
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const item = await CartItem.findOneAndUpdate(filter, update, options).exec();
    return res.status(200).json({ success: true, item });
  } catch (err) {
    console.error('POST /api/cart/add error:', err);
    if (err && err.code === 11000) return res.status(409).json({ error: 'Item already in cart' });
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req.user && req.user._id) || req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const items = await CartItem.find({ userId, purchased: false }).lean().exec();
    return res.json({ items });
  } catch (err) {
    console.error('GET /api/cart error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Checkout cart - create order and purchase records
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { address, transactionId } = req.body;
    
    // UPI-only checkout: require a transactionId
    if (!transactionId) {
      return res.status(400).json({ error: 'UPI payment required: missing transactionId' });
    }
    
    // Get all cart items for the user
    const cartItems = await CartItem.find({ userId, purchased: false });
    
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    // Create an Order record
    const Order = require('../models/Order');
    // Enforce UPI
    const paymentMethod = 'upi';
    const paymentStatus = 'completed';
    const orderStatus = 'completed';
    const createdOrder = new Order({
      userId,
      items: cartItems.map(item => ({
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        price: item.price,
        imageUrl: item.imageUrl
      })),
      totalAmount,
      status: orderStatus,
      paymentMethod,
      paymentStatus,
      transactionId: transactionId,
      address: address || {}
    });
    await createdOrder.save();
    
    // Create purchase records for each item
    const Purchase = require('../models/Purchase');
    const purchaseRecords = cartItems.map(item => ({
      bookId: item.bookId,
      title: item.title,
      author: item.author,
      price: item.price,
      quantity: 1,
      userId: userId
    }));
    
    await Purchase.insertMany(purchaseRecords);
    
    // Clear cart after successful order creation
    await CartItem.deleteMany({ userId, purchased: false });
    
    res.json({
      success: true,
      message: 'Checkout successful',
      totalAmount,
      itemCount: cartItems.length,
      transactionId: transactionId || `TXN${Date.now()}`,
      order: createdOrder
    });
    
  } catch (err) {
    console.error('POST /api/cart/checkout error:', err);
    return res.status(500).json({ error: 'Server error during checkout' });
  }
});

// Remove item from cart
router.delete('/:itemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    
    const result = await CartItem.findOneAndDelete({ _id: itemId, userId });
    
    if (!result) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    console.error('DELETE /api/cart/:itemId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


