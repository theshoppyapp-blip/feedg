import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    default: '',
    trim: true,
  },
  type: {
    type: String,
    enum: ['supermarket', 'local market'],
    required: true,
  },
}, {
  timestamps: true,
});

storeSchema.index({ name: 1 }, { unique: true });

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store;
