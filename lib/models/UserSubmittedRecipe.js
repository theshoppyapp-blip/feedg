import mongoose from 'mongoose';

const userSubmittedRecipeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

userSubmittedRecipeSchema.index({ userId: 1, createdAt: -1 });
userSubmittedRecipeSchema.index({ recipeId: 1 });

const UserSubmittedRecipe = mongoose.models.UserSubmittedRecipe || mongoose.model('UserSubmittedRecipe', userSubmittedRecipeSchema);

export default UserSubmittedRecipe;
