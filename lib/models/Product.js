import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    default: 'unit',
    trim: true,
  },
}, {
  timestamps: true,
});

productSchema.index({ name: 1 }, { unique: true });
productSchema.index({ category: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
