const mongoose = require('mongoose');
require('./db');

mongoose.connection.once('open', async () => {
  const Customer = require('./models/customer.model');
  const Product = require('./models/product.model');
  const Wishlist = require('./models/wishlist.model');
  const WishlistCollection = require('./models/wishlist-collection.model');

  const customers = await Customer.find().lean();
  console.log('Customers count:', customers.length);
  customers.forEach(c => console.log('Customer:', c._id.toString(), c.name, c.email));

  const products = await Product.find({ isDeleted: { $ne: true } }).limit(10).lean();
  console.log('Sample products count:', products.length);
  products.forEach(p => console.log('Product:', p._id.toString(), p.name, p.category, p.image || (p.images && p.images[0])));

  const collections = await WishlistCollection.find().lean();
  console.log('Collections count:', collections.length);
  collections.forEach(col => console.log('Collection:', col._id.toString(), col.customerId.toString(), col.name));

  const wishlists = await Wishlist.find({ isDeleted: { $ne: true } }).lean();
  console.log('Wishlist items count:', wishlists.length);

  process.exit(0);
});

