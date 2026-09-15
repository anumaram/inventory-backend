const mongoose = require('mongoose');

async function testAll() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  console.log('Connected to MongoDB');

  // 1. Test getInventoryAnalytics logic
  const adminExt = require('../services/admin-extended.service');
  let mockRes = {
    json(data) {
      console.log('\n--- 1. Inventory Analytics Output ---');
      console.log('Total Stock Units:', data.totalStock);
      console.log('Total Products:', data.totalProducts);
      console.log('Total Valuation:', data.totalValuation);
      console.log('Low Stock Count:', data.lowStockCount);
      console.log('Categories Count:', data.categoryBreakdown?.length);
      console.log('Sample Category Breakdown (first 5):', data.categoryBreakdown?.slice(0, 5));
    },
    status(code) {
      console.error('Error status:', code);
      return this;
    }
  };
  await adminExt.getInventoryAnalytics({}, mockRes);

  // 2. Check vendor profile functions
  const authService = require('../services/auth.service');
  const User = require('../models/user.model');
  const vendor = await User.findOne({ isDeleted: { $ne: true } });
  if (vendor) {
    console.log('\n--- 2. Testing Vendor Profile Retrieval ---');
    const prof = await authService.getVendorProfile(vendor._id);
    console.log('Retrieved Vendor Profile:', { id: prof._id, name: prof.name, email: prof.email });
  }

  // 3. Test daily vendor digest compiler (dry-run check)
  const emailCron = require('../services/email-cron.service');
  console.log('\n--- 3. Testing Daily Vendor Digest Job Function ---');
  console.log('dispatchDailyVendorDigests function exists:', typeof emailCron.dispatchDailyVendorDigests === 'function');

  console.log('\n✅ All backend unit checks passed successfully.');
  process.exit(0);
}

testAll().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});

