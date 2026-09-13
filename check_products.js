const mongoose = require('mongoose');
require('./db');

mongoose.connection.once('open', async () => {
  const Product = require('./models/product.model');
  const solimo = await Product.find({ name: /Solimo/i }).lean();
  console.log('Solimo products:', JSON.stringify(solimo.map(p => ({ _id: p._id, name: p.name, image: p.image, images: p.images })), null, 2));

  const sampleProducts = await Product.find({ isDeleted: { $ne: true } }).limit(20).lean();
  console.log('Sample images:', sampleProducts.map(p => ({ name: p.name, image: p.image, images: p.images })));

  process.exit(0);
});

