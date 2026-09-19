/**
 * Migration Script: Unify AI Collections to aiconversations and aisettings
 */
const mongoose = require('mongoose');
require('../db');

mongoose.connection.once('open', async () => {
  try {
    const collections = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name);
    console.log('Current Collections:', collections);

    if (collections.includes('darwinconversations') && !collections.includes('aiconversations')) {
      console.log('Renaming darwinconversations to aiconversations...');
      await mongoose.connection.db.collection('darwinconversations').rename('aiconversations');
      console.log('Renamed darwinconversations -> aiconversations.');
    }

    if (collections.includes('darwinsettings') && !collections.includes('aisettings')) {
      console.log('Renaming darwinsettings to aisettings...');
      await mongoose.connection.db.collection('darwinsettings').rename('aisettings');
      console.log('Renamed darwinsettings -> aisettings.');
    }

    const aiconversations = mongoose.connection.db.collection('aiconversations');
    const aisettings = mongoose.connection.db.collection('aisettings');

    const convResult = await aiconversations.updateMany(
      { aiType: { $exists: false } },
      [{ $set: { aiType: 'darwin', userId: '$customerId', userType: 'customer' } }]
    );
    console.log(`Updated ${convResult.modifiedCount} documents in aiconversations with aiType: darwin`);

    const settResult = await aisettings.updateMany(
      { aiType: { $exists: false } },
      [{ $set: { aiType: 'darwin', userId: '$customerId', userType: 'customer' } }]
    );
    console.log(`Updated ${settResult.modifiedCount} documents in aisettings with aiType: darwin`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
});

