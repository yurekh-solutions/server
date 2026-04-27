const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Create new order (Buyer)
router.post('/', protect, async (req, res) => {
  try {
    const { items, deliveryAddress, notes, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
      });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    let supplierId = null;
    const orderItems = [];

    for (const item of items) {
      const equipment = await Equipment.findById(item.equipmentId);
      
      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: `Equipment ${item.equipmentId} not found`,
        });
      }

      if (!equipment.availability) {
        return res.status(400).json({
          success: false,
          message: `${equipment.name} is not available`,
        });
      }

      // All items should be from same supplier for now
      if (!supplierId) {
        supplierId = equipment.supplierId;
      } else if (supplierId.toString() !== equipment.supplierId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'All items must be from the same supplier',
        });
      }

      const totalPrice = equipment.basePrice * item.quantity;
      totalAmount += totalPrice;

      orderItems.push({
        equipmentId: equipment._id,
        name: equipment.name,
        image: equipment.images[0] || '',
        quantity: item.quantity,
        pricePerUnit: equipment.basePrice,
        totalPrice,
        eventDate: item.eventDate,
        returnDate: item.returnDate,
      });
    }

    // Create order
    const order = await Order.create({
      buyerId: req.user.id,
      supplierId,
      items: orderItems,
      totalAmount,
      paymentMethod: paymentMethod || 'manual',
      deliveryAddress,
      notes,
      status: 'pending',
      paymentStatus: 'pending',
    });

    // Create chat for this order
    const chat = await Chat.create({
      orderId: order._id,
      participants: [req.user.id, supplierId],
      messages: [{
        senderId: req.user.id,
        message: `New order created: ${order.orderNumber}`,
        type: 'system',
      }],
    });

    // Update order with chat ID
    order.chatId = chat._id;
    await order.save();

    // Notify supplier
    await Notification.create({
      userId: supplierId,
      type: 'order_update',
      title: 'New Order Request',
      message: `You have a new order request #${order.orderNumber}`,
      data: { orderId: order._id },
    });

    // Populate order data
    const populatedOrder = await Order.findById(order._id)
      .populate('buyerId', 'name phone email')
      .populate('supplierId', 'name businessName phone')
      .populate('items.equipmentId');

    res.status(201).json({
      success: true,
      order: populatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/orders
// @desc    Get buyer's orders
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user.id })
      .populate('supplierId', 'name businessName phone rating')
      .populate('items.equipmentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/orders/supplier
// @desc    Get supplier's orders
router.get('/supplier', protect, async (req, res) => {
  try {
    const orders = await Order.find({ supplierId: req.user.id })
      .populate('buyerId', 'name phone email')
      .populate('items.equipmentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'name phone email')
      .populate('supplierId', 'name businessName phone rating avatar')
      .populate('items.equipmentId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if user is authorized
    if (
      order.buyerId._id.toString() !== req.user.id &&
      order.supplierId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Supplier)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Only supplier can update status
    if (order.supplierId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only supplier can update order status',
      });
    }

    order.status = status;
    await order.save();

    // Notify buyer
    await Notification.create({
      userId: order.buyerId,
      type: 'order_update',
      title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your order #${order.orderNumber} is now ${status}`,
      data: { orderId: order._id },
    });

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order (Buyer or Supplier)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (
      order.buyerId.toString() !== req.user.id &&
      order.supplierId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order',
      });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this order',
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Notify other party
    const notifyUserId = req.user.id === order.buyerId.toString() 
      ? order.supplierId 
      : order.buyerId;

    await Notification.create({
      userId: notifyUserId,
      type: 'order_update',
      title: 'Order Cancelled',
      message: `Order #${order.orderNumber} has been cancelled`,
      data: { orderId: order._id },
    });

    res.json({
      success: true,
      message: 'Order cancelled',
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/orders/:id/pay
// @desc    Mark order as paid
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const { paymentMethod, transactionId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Only supplier can confirm payment
    if (order.supplierId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only supplier can confirm payment',
      });
    }

    order.paymentStatus = 'paid';
    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.paymentDetails = {
      transactionId,
      paidAt: new Date(),
    };
    await order.save();

    // Update supplier earnings
    await User.findByIdAndUpdate(order.supplierId, {
      $inc: { totalEarnings: order.totalAmount, totalOrders: 1 },
    });

    // Notify buyer
    await Notification.create({
      userId: order.buyerId,
      type: 'payment',
      title: 'Payment Confirmed',
      message: `Payment for order #${order.orderNumber} has been confirmed`,
      data: { orderId: order._id },
    });

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
