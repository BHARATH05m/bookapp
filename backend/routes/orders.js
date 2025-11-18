const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const CartItem = require('../models/CartItem');
const Purchase = require('../models/Purchase');
const { authenticateToken } = require('../middleware/auth');

// Create order from cart items
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all cart items for the user
    const cartItems = await CartItem.find({ userId });
    
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    // Create order
    const order = new Order({
      userId,
      items: cartItems.map(item => ({
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        price: item.price,
        imageUrl: item.imageUrl
      })),
      totalAmount
    });
    
    await order.save();
    
    // Create purchase records for each item
    const purchaseRecords = cartItems.map(item => ({
      bookId: item.bookId,
      title: item.title,
      author: item.author,
      price: item.price,
      quantity: 1, // Assuming 1 quantity per cart item
      userId: userId
    }));
    
    await Purchase.insertMany(purchaseRecords);
    
    // Clear cart after creating order
    await CartItem.deleteMany({ userId });
    
    res.status(201).json({
      message: 'Order created successfully',
      order: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Get user's orders
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check if user is accessing their own orders or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username email');
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get all orders (admin only)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username email');
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Update order status (admin only)
router.put('/:orderId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Map paymentStatus for COD convenience
    let paymentStatus = order.paymentStatus;
    if (order.paymentMethod === 'cod') {
      if (status === 'completed') paymentStatus = 'completed';
      if (status === 'cancelled') paymentStatus = 'failed';
      if (status === 'pending') paymentStatus = 'pending';
    }

    order.status = status;
    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

module.exports = router;
