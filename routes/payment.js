const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect: auth } = require('../middleware/auth');

let stripe;
try {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} catch (error) {
  console.log('⚠️  Stripe not configured. Payment routes will be limited.');
}

// Create payment intent
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        buyerId: req.user.id,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ message: 'Payment processing failed' });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await Order.findOneAndUpdate(
        { _id: paymentIntent.metadata.orderId },
        {
          paymentStatus: 'paid',
          paymentMethod: 'stripe',
        }
      );
      console.log('Payment succeeded for order:', paymentIntent.metadata.orderId);
      break;
      
    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      await Order.findOneAndUpdate(
        { _id: failedIntent.metadata.orderId },
        {
          paymentStatus: 'failed',
        }
      );
      console.log('Payment failed for order:', failedIntent.metadata.orderId);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Refund payment
router.post('/refund', auth, async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only supplier or admin can refund
    if (order.supplierId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'refunded',
    });

    res.json({ message: 'Refund processed', refund });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Refund processing failed' });
  }
});

module.exports = router;
