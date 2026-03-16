import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  budget: {
    type: Number,
    required: true,
    min: 1,
  },
  people: {
    type: Number,
    required: true,
    min: 1,
  },
  foodType: {
    type: String,
    default: 'healthy',
  },
  dietaryRestrictions: {
    type: [String],
    default: [],
  },
  likedFoods: {
    type: [String],
    default: [],
  },
  likedShops: {
    type: [String],
    default: [],
  },
  userLocation: {
    type: String,
    default: '',
  },
  meals: {
    type: [String],
    default: [],
  },
  shoppingList: {
    type: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        quantity: Number,
        unit: String,
      },
    ],
    default: [],
  },
  estimatedCosts: {
    type: [
      {
        storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
        storeName: String,
        total: Number,
      },
    ],
    default: [],
  },
}, {
  timestamps: true,
});

mealPlanSchema.index({ userId: 1, createdAt: -1 });

const MealPlan = mongoose.models.MealPlan || mongoose.model('MealPlan', mealPlanSchema);

export default MealPlan;
