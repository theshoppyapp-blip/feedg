import mongoose from 'mongoose';

const recipeIngredientSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    default: 'unit',
    trim: true,
  },
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ingredients: {
    type: [recipeIngredientSchema],
    default: [],
  },
  servings: {
    type: Number,
    required: true,
    min: 1,
  },
  instructions: {
    type: [String],
    default: [],
  },
  tags: {
    type: [String],
    enum: ['healthy', 'cheap', 'high protein', 'vegetarian', 'student budget'],
    default: ['healthy'],
  },
  source: {
    type: String,
    enum: ['seed', 'user'],
    default: 'seed',
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
  },
}, {
  timestamps: true,
});

recipeSchema.index({ tags: 1 });
recipeSchema.index({ status: 1 });

const Recipe = mongoose.models.Recipe || mongoose.model('Recipe', recipeSchema);

export default Recipe;
