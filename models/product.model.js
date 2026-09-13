const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Others', trim: true, index: true },
    description: { type: String, default: '', trim: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, default: 10, min: 0, max: 100 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    returnPolicy: { type: String, default: '7 Days Return & Exchange', trim: true },
    warranty: { type: String, default: '1 Year Manufacturer Warranty', trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
