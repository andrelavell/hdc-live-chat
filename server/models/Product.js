const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  tags: [String],
  features: [String],
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  availability: {
    inStock: { type: Boolean, default: true },
    quantity: { type: Number, default: 0 }
  },
  images: [String],
  shopifyProductId: String,
  aiContext: { 
    type: String, 
    required: true,
    description: "Detailed information for AI to reference when answering customer questions"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for search performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);
