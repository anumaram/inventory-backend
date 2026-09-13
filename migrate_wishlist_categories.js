const mongoose = require('mongoose');
const Wishlist = require('./models/wishlist.model');
const Product = require('./models/product.model');

const MONGO_URI = 'mongodb://127.0.0.1:27017/inventory-app';

async function migrateWishlistCategories() {
  await mongoose.connect(MONGO_URI);

  const records = await Wishlist.find({}).select('_id productId category').lean();
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const product = await Product.findById(record.productId).select('category').lean();
    if (!product) {
      skipped += 1;
      continue;
    }

    const category = product.category || 'Others';
    if (record.category !== category) {
      await Wishlist.updateOne({ _id: record._id }, { $set: { category } });
      updated += 1;
    }
  }

  console.log(`Wishlist category migration complete: ${updated} updated, ${skipped} skipped.`);
  await mongoose.disconnect();
}

migrateWishlistCategories().catch(async (error) => {
  console.error('Wishlist category migration failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
