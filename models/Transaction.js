const mongoose = require('mongoose');

/**
 * Transaction ledger — append-only record of every money movement.
 *
 * Why this exists:
 *   1. Auditable single source of truth for all payments, refunds, commissions,
 *      payouts, holds and releases. Order.advanceAmount etc. are caches; this
 *      is the ledger.
 *   2. Forward-compat shape for a future SQL ledger (Postgres). Each doc maps
 *      cleanly to a `transactions` row with standard columns.
 *   3. Lets admin panel (Phase C) compute GMV, vendor earnings, refund rate,
 *      pending payouts, etc. with simple aggregations.
 *
 * Never update an existing doc's `amount` / `type` / `direction` in place.
 * Corrections happen by posting a reversing entry.
 */
const TransactionSchema = new mongoose.Schema(
  {
    // Business entities this movement relates to.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    counterpartyId: {
      // e.g. vendor when userId is buyer, or platform for commission.
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      default: null,
    },

    // What kind of movement is this.
    type: {
      type: String,
      enum: [
        'advance_payment',    // buyer pays advance on booking
        'balance_payment',    // buyer pays balance after End-OTP
        'commission',         // platform commission deduction
        'payout',             // platform -> vendor bank
        'refund',             // order cancelled / dispute
        'hold',               // funds locked in escrow
        'release',            // escrow released to vendor
        'adjustment',         // admin manual correction
      ],
      required: true,
      index: true,
    },

    // Accounting direction from userId's perspective.
    direction: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    // Amount in paise (avoid float rounding). amountInr = amount / 100.
    amountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR'],
    },

    // Payment rail info (null while payments are mocked).
    provider: {
      type: String,
      enum: ['razorpay', 'mock', 'manual', null],
      default: 'mock',
    },
    providerRef: {
      type: String,
      default: null,    // razorpay payment_id / order_id
      index: true,
    },

    // Lifecycle.
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'reversed'],
      default: 'pending',
      index: true,
    },

    // Free-form details for auditors. NEVER trust this for logic.
    notes: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // For reversing entries — points at the original txn.
    reversesTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

// Common query paths.
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ orderId: 1, type: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

// Virtual for display.
TransactionSchema.virtual('amountInr').get(function () {
  return (this.amountPaise || 0) / 100;
});

TransactionSchema.set('toJSON', { virtuals: true });
TransactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
