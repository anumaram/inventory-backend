const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const Product = require('../models/product.model');
  const count = await Product.countDocuments();
  console.log('Total products:', count);
  const categories = await Product.distinct('category');
  console.log('Categories:', categories);
  const fashion = await Product.find({
    category: { $in: ['Fashion', 'Fashion & Apparel', 'Footwear & Shoes', 'shoes'] }
  }).select('name category clothingType gender price').lean();
  console.log('Count of fashion products:', fashion.length);
  const withoutType = fashion.filter(p => !p.clothingType);
  console.log('Without clothingType:', withoutType.length);
  console.log('Sample with types:');
  fashion.forEach(p => console.log(`${p._id}: ${p.name} | Cat: ${p.category} | Type: ${p.clothingType || 'NONE'} | Gender: ${p.gender || 'NONE'}`));
  process.exit(0);
}
run();
