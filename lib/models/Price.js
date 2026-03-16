import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  source: {
    type: String,
    enum: ['scraped', 'user'],
    default: 'scraped',
  },
}, {
  timestamps: true,
});

priceSchema.index({ storeId: 1, productId: 1, source: 1 });
priceSchema.index({ updatedAt: -1 });

const Price = mongoose.models.Price || mongoose.model('Price', priceSchema);

export default Price;
