// ────────────────────────────────────────────────────────────────────────────
// Razorpay SDK Initialization
// Docs: https://razorpay.com/docs/api
// ────────────────────────────────────────────────────────────────────────────

const Razorpay = require('razorpay');

let razorpay = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.log('⚠️  Razorpay keys not configured. Payment routes will use demo mode.');
  }
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
}

module.exports = razorpay;
