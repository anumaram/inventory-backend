const mongoose = require('mongoose');
require('./db');

const Customer = require('./models/customer.model');
const Product = require('./models/product.model');
const Wishlist = require('./models/wishlist.model');
const WishlistCollection = require('./models/wishlist-collection.model');

const DEFAULT_COLLECTIONS = [
  { name: 'Favorites', icon: 'Heart' },
  { name: 'Home & Living', icon: 'Home' },
  { name: 'Tech & Gadgets', icon: 'Smartphone' },
  { name: 'Fashion Picks', icon: 'ShoppingBag' },
  { name: 'Daily Essentials', icon: 'Sparkles' }
];

mongoose.connection.once('open', async () => {
  try {
    console.log('Seeding wishlist collections and items...');

    const customers = await Customer.find().lean();
    console.log(`Found ${customers.length} customers.`);

    const products = await Product.find({ isDeleted: { $ne: true } }).lean();
    if (products.length === 0) {
      console.log('No products found to wishlist.');
      process.exit(0);
    }
    console.log(`Found ${products.length} catalog products.`);

    for (const customer of customers) {
      const cId = customer._id;

      // 1. Ensure default collections exist for this customer
      const existingCollections = await WishlistCollection.find({ customerId: cId }).lean();
      const existingNames = new Set(existingCollections.map(c => c.name.toLowerCase()));

      const createdCollections = [...existingCollections];

      for (const def of DEFAULT_COLLECTIONS) {
        if (!existingNames.has(def.name.toLowerCase())) {
          const col = await WishlistCollection.create({
            customerId: cId,
            name: def.name
          });
          createdCollections.push(col.toObject ? col.toObject() : col);
        }
      }

      // 2. Ensure customer has 5-8 wishlisted items distributed across collections
      const existingWishlist = await Wishlist.find({ customerId: cId, isDeleted: { $ne: true } }).lean();
      if (existingWishlist.length < 5) {
        // Pick 6 diverse products from catalog
        const sampleProducts = products.slice(0, 8);
        for (let i = 0; i < sampleProducts.length; i++) {
          const prod = sampleProducts[i];
          const alreadyWishlisted = existingWishlist.some(w => String(w.productId) === String(prod._id));
          if (!alreadyWishlisted) {
            // Assign to appropriate collection
            let targetCol = createdCollections[i % createdCollections.length];
            if (prod.category && /home|furniture|kitchen/i.test(prod.category)) {
              targetCol = createdCollections.find(c => /home/i.test(c.name)) || targetCol;
            } else if (prod.category && /electronics|gadget|mobile/i.test(prod.category)) {
              targetCol = createdCollections.find(c => /tech/i.test(c.name)) || targetCol;
            } else if (prod.category && /fashion|clothing|footwear/i.test(prod.category)) {
              targetCol = createdCollections.find(c => /fashion/i.test(c.name)) || targetCol;
            }

            try {
              await Wishlist.findOneAndUpdate(
                { customerId: cId, productId: prod._id },
                {
                  customerId: cId,
                  productId: prod._id,
                  collectionId: targetCol._id,
                  category: prod.category || 'Others',
                  isDeleted: false
                },
                { upsert: true, new: true }
              );
            } catch (err) {
              // Ignore duplicates
            }
          }
        }
      }
    }

    console.log('Successfully seeded default collections and wishlist items for all customers.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding wishlist:', error);
    process.exit(1);
  }
});

