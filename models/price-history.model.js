const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
      index: true
    },
    currentPrice: { type: Number, required: true },
    originalPrice: { type: Number },
    lowestPrice: { type: Number, required: true },
    lowestDate: { type: Date, default: Date.now },
    highestPrice: { type: Number, required: true },
    highestDate: { type: Date, default: Date.now },
    averagePrice: { type: Number, default: 0 },
    records: [
      {
        price: { type: Number, required: true },
        date: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('PriceHistory', priceHistorySchema);

