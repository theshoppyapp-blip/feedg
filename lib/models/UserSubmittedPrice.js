import mongoose from 'mongoose';

const userSubmittedPriceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

userSubmittedPriceSchema.index({ storeId: 1, productId: 1 });
userSubmittedPriceSchema.index({ userId: 1, createdAt: -1 });

const UserSubmittedPrice = mongoose.models.UserSubmittedPrice || mongoose.model('UserSubmittedPrice', userSubmittedPriceSchema);

export default UserSubmittedPrice;
