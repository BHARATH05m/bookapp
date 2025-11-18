const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const CartItem = require('../models/CartItem');
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');

// Initialize UPI payment
router.post('/upi/initiate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { upiId } = req.body;
    
    // Get cart items
    const cartItems = await CartItem.find({ userId });
    
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    // Generate order ID
    const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Create pending order
    const order = new Order({
      userId,
      items: cartItems.map(item => ({
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        price: item.price,
        imageUrl: item.imageUrl
      })),
      totalAmount,
      paymentMethod: 'upi',
      paymentStatus: 'pending',
      status: 'pending',
      paymentDetails: {
        upiId: upiId || paymentService.upiId
      }
    });
    
    await order.save();
    
    // Generate UPI payment request
    const paymentRequest = paymentService.generateUPIPaymentRequest(
      totalAmount,
      orderId,
      {
        name: req.user.username,
        email: req.user.email
      }
    );
    
    // Update order with transaction ID
    order.transactionId = paymentRequest.transactionId;
    await order.save();
    
    res.json({
      success: true,
      orderId: order._id,
      transactionId: paymentRequest.transactionId,
      upiString: paymentRequest.upiString,
      qrCode: paymentRequest.qrCode,
      amount: totalAmount,
      upiId: paymentRequest.upiId
    });
    
  } catch (error) {
    console.error('UPI payment initiation error:', error);
    res.status(500).json({ message: 'Failed to initiate UPI payment' });
  }
});

// Verify UPI payment
router.post('/upi/verify', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const userId = req.user.id;
    
    // Find the order
    const order = await Order.findOne({ 
      transactionId, 
      userId,
      paymentStatus: 'pending'
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or already processed' });
    }
    
    // Simulate payment verification (in real implementation, verify with gateway)
    const paymentResult = await paymentService.simulateUPIPaymentVerification(transactionId);
    
    if (paymentResult.status === 'completed') {
      // Update order status
      order.paymentStatus = 'completed';
      order.status = 'completed';
      order.upiTransactionId = paymentResult.gatewayResponse.gatewayTransactionId;
      order.paymentDetails.paymentTime = paymentResult.paymentTime;
      order.paymentDetails.gatewayTransactionId = paymentResult.gatewayResponse.gatewayTransactionId;
      order.paymentDetails.paymentGateway = 'UPI';
      
      await order.save();
      
      // Record purchases for reporting
      try {
        const Purchase = require('../models/Purchase');
        const purchaseRecords = (order.items || []).map(item => ({
          bookId: item.bookId,
          title: item.title,
          author: item.author,
          price: item.price,
          quantity: 1,
          userId: order.userId
        }));
        if (purchaseRecords.length > 0) {
          await Purchase.insertMany(purchaseRecords);
        }
      } catch (e) {
        console.error('Failed to create purchase records after UPI success:', e);
      }

      // Clear cart
      await CartItem.deleteMany({ userId });
      
      res.json({
        success: true,
        message: 'Payment successful',
        orderId: order._id,
        transactionId,
        gatewayTransactionId: paymentResult.gatewayResponse.gatewayTransactionId
      });
    } else {
      // Payment failed
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      await order.save();
      
      res.json({
        success: false,
        message: 'Payment failed',
        orderId: order._id,
        transactionId
      });
    }
    
  } catch (error) {
    console.error('UPI payment verification error:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

// Get payment status
router.get('/status/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    
    const order = await Order.findOne({ 
      transactionId, 
      userId 
    }).select('paymentStatus status totalAmount createdAt');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({
      transactionId,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      amount: order.totalAmount,
      createdAt: order.createdAt
    });
    
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: 'Failed to get payment status' });
  }
});

// Payment callback (for real UPI gateway integration)
router.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body;
    
    // Verify callback authenticity
    const verificationResult = paymentService.verifyPaymentCallback(callbackData);
    
    if (verificationResult.verified) {
      // Update order status based on payment result
      const order = await Order.findOne({ 
        transactionId: verificationResult.transactionId 
      });
      
      if (order) {
        order.paymentStatus = verificationResult.status;
        order.status = verificationResult.status === 'completed' ? 'completed' : 'cancelled';
        order.paymentDetails.paymentTime = verificationResult.paymentTime;
        
        await order.save();
        
        // Clear cart if payment successful
        if (verificationResult.status === 'completed') {
          await CartItem.deleteMany({ userId: order.userId });
        }
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ message: 'Callback processing failed' });
  }
});

// Process refund
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;
    const userId = req.user.id;
    
    // Find the order
    const order = await Order.findOne({ 
      _id: orderId, 
      userId,
      paymentStatus: 'completed'
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not eligible for refund' });
    }
    
    // Process refund
    const refundResult = await paymentService.processRefund(
      order.transactionId,
      amount || order.totalAmount,
      reason
    );
    
    // Update order status
    order.paymentStatus = 'refunded';
    order.status = 'cancelled';
    await order.save();
    
    res.json({
      success: true,
      refundId: refundResult.refundId,
      amount: refundResult.amount,
      status: refundResult.status
    });
    
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ message: 'Failed to process refund' });
  }
});

module.exports = router;
