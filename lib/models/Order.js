import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'nzd',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'canceled', 'refunded'],
    default: 'pending',
  },
  stripeCheckoutSessionId: String,
  stripePaymentIntentId: String,
}, {
  timestamps: true,
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ stripeCheckoutSessionId: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
