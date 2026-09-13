const mongoose = require('mongoose');
const Wishlist = require('./models/wishlist.model');
const WishlistCollection = require('./models/wishlist-collection.model');

const MONGO_URI = 'mongodb://127.0.0.1:27017/inventory-app';

async function migrateWishlistCollections() {
  await mongoose.connect(MONGO_URI);
  const records = await Wishlist.find({ $or: [{ collectionId: { $exists: false } }, { collectionId: null }] }).select('_id customerId').lean();
  const collections = new Map();
  let updated = 0;

  for (const record of records) {
    const customerKey = String(record.customerId);
    let collectionId = collections.get(customerKey);
    if (!collectionId) {
      const collection = await WishlistCollection.findOneAndUpdate(
        { customerId: record.customerId, name: 'My Wishlist' },
        { $setOnInsert: { customerId: record.customerId, name: 'My Wishlist' } },
        { upsert: true, returnDocument: 'after' }
      );
      collectionId = collection._id;
      collections.set(customerKey, collectionId);
    }
    await Wishlist.updateOne({ _id: record._id }, { $set: { collectionId } });
    updated += 1;
  }

  console.log(`Wishlist collection migration complete: ${updated} wishlist items assigned.`);
  await mongoose.disconnect();
}

migrateWishlistCollections().catch(async (error) => {
  console.error('Wishlist collection migration failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
