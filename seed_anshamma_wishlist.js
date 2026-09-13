const mongoose = require('mongoose');
require('./db');

const Customer = require('./models/customer.model');
const Product = require('./models/product.model');
const Wishlist = require('./models/wishlist.model');
const WishlistCollection = require('./models/wishlist-collection.model');

mongoose.connection.once('open', async () => {
  const customerId = '6aa1a7dfbb5a7aeb3ecac6d6';
  console.log('Seeding wishlist items for customer:', customerId);

  // 1. Get all collections for Anshamma
  const collections = await WishlistCollection.find({ customerId }).lean();
  console.log(`Found ${collections.length} collections for Anshamma:`, collections.map(c => c.name));

  // 2. Get active catalog products
  const products = await Product.find({ isDeleted: { $ne: true } }).lean();
  console.log(`Found ${products.length} catalog products.`);

  // Map products by category / keywords
  const gamingProducts = products.filter(p => /game|gaming|playstation|xbox|console/i.test(p.name || p.category));
  const homeProducts = products.filter(p => /furniture|wood|sofa|chair|lamp|bookcase|home/i.test(p.name || p.category));
  const techProducts = products.filter(p => /phone|headphone|earbud|apple|laptop|watch|electronics/i.test(p.name || p.category));
  const fashionProducts = products.filter(p => /shirt|shoe|dress|cloth|t-shirt|shoes|fashion/i.test(p.name || p.category));
  const beautyProducts = products.filter(p => /scrub|beauty|care|cream|oil|salt/i.test(p.name || p.category));
  const otherProducts = products.filter(p => !gamingProducts.includes(p) && !homeProducts.includes(p) && !techProducts.includes(p));

  // Clear existing wishlist items for Anshamma to ensure a clean, perfectly structured state
  await Wishlist.deleteMany({ customerId });

  const wishlistedItems = [];

  for (const col of collections) {
    const colName = col.name.toLowerCase();
    let selectedProducts = [];

    if (colName.includes('gaming')) {
      selectedProducts = gamingProducts.slice(0, 3);
      if (selectedProducts.length === 0) selectedProducts = products.slice(0, 2);
    } else if (colName.includes('home') || colName.includes('living')) {
      selectedProducts = homeProducts.slice(0, 3);
    } else if (colName.includes('tech') || colName.includes('gadget')) {
      selectedProducts = techProducts.slice(0, 3);
    } else if (colName.includes('fashion') || colName.includes('style')) {
      selectedProducts = fashionProducts.slice(0, 3);
    } else if (colName.includes('favorite') || colName.includes('favourite')) {
      selectedProducts = [
        techProducts[0] || products[0],
        fashionProducts[0] || products[1],
        homeProducts[0] || products[2]
      ].filter(Boolean);
    } else {
      // Default / My Wishlist / other
      selectedProducts = otherProducts.slice(0, 3);
      if (selectedProducts.length === 0) selectedProducts = products.slice(3, 6);
    }

    for (const p of selectedProducts) {
      if (!p) continue;
      const alreadyAdded = wishlistedItems.some(w => String(w.productId) === String(p._id));
      if (!alreadyAdded) {
        const item = await Wishlist.create({
          customerId,
          productId: p._id,
          collectionId: col._id,
          category: p.category || 'General',
          isDeleted: false
        });
        wishlistedItems.push(item);
      }
    }
  }

  console.log(`Successfully added ${wishlistedItems.length} wishlisted items across Anshamma's collections.`);
  process.exit(0);
});

