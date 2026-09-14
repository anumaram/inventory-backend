/**
 * Database Index Migration Script
 * ================================
 * Creates all missing indexes across every collection for optimal query performance.
 * Safe to run multiple times — createIndex() is idempotent (skips if already exists).
 */
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const db = mongoose.connection.db;
  let created = 0;
  let skipped = 0;

  async function ensureIndex(collectionName, spec, options = {}) {
    const label = `${collectionName} → ${JSON.stringify(spec)}${options.unique ? ' (unique)' : ''}`;
    try {
      await db.collection(collectionName).createIndex(spec, options);
      created++;
      console.log(`  ✓ ${label}`);
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        skipped++;
        console.log(`  ⏭ SKIP ${label} — conflicting index exists`);
      } else {
        console.error(`  ✗ FAIL ${label}:`, err.message);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('  DATABASE INDEX MIGRATION');
  console.log('════════════════════════════════════════════════\n');

  // ─── PRODUCTS ──────────────────────────────────────────────
  console.log('📦 products');
  await ensureIndex('products', { userId: 1 });                                          // Vendor's product listing
  await ensureIndex('products', { isDeleted: 1 });                                       // Soft-delete filter
  await ensureIndex('products', { userId: 1, isDeleted: 1, createdAt: -1 });             // Vendor dashboard: my products sorted
  await ensureIndex('products', { category: 1, isDeleted: 1 });                          // Category browsing
  await ensureIndex('products', { isDeleted: 1, createdAt: -1 });                        // Admin: all products newest first
  await ensureIndex('products', { name: 'text', description: 'text' });                  // Full-text search
  await ensureIndex('products', { price: 1 });                                           // Price sort/filter
  await ensureIndex('products', { rating: -1 });                                         // Top-rated sort
  await ensureIndex('products', { discountPercentage: -1 });                             // Best deals sort
  await ensureIndex('products', { quantity: 1, isDeleted: 1 });                          // Low stock alerts

  // ─── ORDERS ────────────────────────────────────────────────
  console.log('📋 orders');
  await ensureIndex('orders', { customerId: 1 });                                        // Customer's orders
  await ensureIndex('orders', { vendorId: 1 });                                          // Vendor's orders
  await ensureIndex('orders', { status: 1 });                                            // Status filter
  await ensureIndex('orders', { customerId: 1, status: 1, createdAt: -1 });              // Customer: orders by status sorted
  await ensureIndex('orders', { vendorId: 1, status: 1, createdAt: -1 });                // Vendor: orders by status sorted
  await ensureIndex('orders', { customerId: 1, createdAt: -1 });                         // Customer: all orders sorted
  await ensureIndex('orders', { vendorId: 1, createdAt: -1 });                           // Vendor: all orders sorted
  await ensureIndex('orders', { placedAt: -1 });                                         // Admin: recent orders
  await ensureIndex('orders', { isDeleted: 1 });                                         // Soft-delete filter
  await ensureIndex('orders', { paymentMethod: 1 });                                     // Payment analytics
  await ensureIndex('orders', { 'items.productId': 1 });                                 // Find orders containing product
  await ensureIndex('orders', { status: 1, placedAt: -1 });                              // Admin dashboard: orders by status

  // ─── CUSTOMERS ─────────────────────────────────────────────
  console.log('👤 customers');
  await ensureIndex('customers', { email: 1 }, { unique: true, sparse: true });          // Login lookup + uniqueness
  await ensureIndex('customers', { isDeleted: 1 });                                      // Soft-delete filter
  await ensureIndex('customers', { phone: 1 }, { sparse: true });                        // Phone lookup
  await ensureIndex('customers', { createdAt: -1 });                                     // Admin: newest customers

  // ─── USERS (VENDORS) ──────────────────────────────────────
  console.log('🏪 users (vendors)');
  await ensureIndex('users', { email: 1 }, { unique: true, sparse: true });              // Login lookup + uniqueness
  await ensureIndex('users', { isDeleted: 1 });                                          // Soft-delete filter
  await ensureIndex('users', { createdAt: -1 });                                         // Admin: newest vendors

  // ─── REVIEWS ───────────────────────────────────────────────
  console.log('⭐ reviews');
  await ensureIndex('reviews', { customerId: 1 });                                       // Customer's reviews
  await ensureIndex('reviews', { productId: 1, createdAt: -1 });                         // Product review feed sorted
  await ensureIndex('reviews', { productId: 1, rating: -1 });                            // Product reviews by rating

  // ─── NOTIFICATIONS ─────────────────────────────────────────
  console.log('🔔 notifications');
  await ensureIndex('notifications', { recipientId: 1, recipientType: 1, isRead: 1, createdAt: -1 }); // Inbox feed
  await ensureIndex('notifications', { recipientId: 1, isDeleted: 1, createdAt: -1 });    // All notifications for user
  await ensureIndex('notifications', { createdAt: -1 });                                  // Admin: recent notifications

  // ─── CARTS ─────────────────────────────────────────────────
  console.log('🛒 carts');
  await ensureIndex('carts', { customerId: 1, isDeleted: 1 });                           // Active cart items

  // ─── PAYMENT METHODS ───────────────────────────────────────
  console.log('💳 paymentmethods');
  await ensureIndex('paymentmethods', { customerId: 1, isDeleted: 1 });                  // Customer's active methods
  await ensureIndex('paymentmethods', { customerId: 1, type: 1 });                       // Lookup by type

  // ─── SUPPORT TICKETS ───────────────────────────────────────
  console.log('🎫 supporttickets');
  await ensureIndex('supporttickets', { customerId: 1, createdAt: -1 });                 // Customer's tickets
  await ensureIndex('supporttickets', { vendorId: 1, createdAt: -1 });                   // Vendor's tickets
  await ensureIndex('supporttickets', { status: 1, priority: -1, createdAt: -1 });       // Admin: open tickets by priority
  await ensureIndex('supporttickets', { category: 1 });                                  // Filter by category

  // ─── AUDIT LOGS ────────────────────────────────────────────
  console.log('📜 auditlogs');
  await ensureIndex('auditlogs', { adminId: 1, createdAt: -1 });                        // Logs by admin
  await ensureIndex('auditlogs', { action: 1, createdAt: -1 });                         // Logs by action type

  // ─── INVENTORY HISTORIES ───────────────────────────────────
  console.log('📊 inventoryhistories');
  await ensureIndex('inventoryhistories', { productId: 1, type: 1, createdAt: -1 });    // Product movements by type
  await ensureIndex('inventoryhistories', { vendorId: 1, type: 1, createdAt: -1 });     // Vendor movements by type

  // ─── INVENTORY TRANSFERS ───────────────────────────────────
  console.log('🚚 inventorytransfers');
  await ensureIndex('inventorytransfers', { fromWarehouseId: 1, createdAt: -1 });        // Transfers from warehouse
  await ensureIndex('inventorytransfers', { toWarehouseId: 1, createdAt: -1 });          // Transfers to warehouse

  // ─── RETURNS ───────────────────────────────────────────────
  console.log('↩️  returns');
  await ensureIndex('returns', { status: 1, createdAt: -1 });                            // Admin: returns by status
  await ensureIndex('returns', { refundStatus: 1 });                                     // Refund tracking

  // ─── PROMOTIONS ────────────────────────────────────────────
  console.log('🎯 promotions');
  await ensureIndex('promotions', { targetCategory: 1, isActive: 1 });                   // Category-specific promos
  await ensureIndex('promotions', { isDeleted: 1, isActive: 1, endDate: 1 });            // Active non-deleted promos

  // ─── BANNERS ───────────────────────────────────────────────
  console.log('🖼️  banners');
  await ensureIndex('banners', { isDeleted: 1, isActive: 1 });                           // Active non-deleted banners

  // ─── WISHLISTS ─────────────────────────────────────────────
  console.log('❤️  wishlists');
  await ensureIndex('wishlists', { customerId: 1, isDeleted: 1 });                       // Customer's active wishlist
  await ensureIndex('wishlists', { productId: 1 });                                      // "Who wishlisted this product"

  // ─── TRANSACTIONS ──────────────────────────────────────────
  console.log('💰 transactions');
  await ensureIndex('transactions', { type: 1, createdAt: -1 });                         // Admin: transactions by type
  await ensureIndex('transactions', { status: 1 });                                      // Status filter

  // ─── VENDOR TRANSACTIONS ───────────────────────────────────
  console.log('🏦 vendortransactions');
  await ensureIndex('vendortransactions', { type: 1, createdAt: -1 });                   // Admin: vendor txns by type
  await ensureIndex('vendortransactions', { status: 1 });                                // Status filter

  // ─── COUPONS ───────────────────────────────────────────────
  console.log('🏷️  coupons');
  await ensureIndex('coupons', { isDeleted: 1, isActive: 1 });                           // Active non-deleted coupons

  // ─── WAREHOUSES ────────────────────────────────────────────
  console.log('🏢 warehouses');
  await ensureIndex('warehouses', { isDeleted: 1 });                                     // Soft-delete filter

  // ─── ADDRESSES ─────────────────────────────────────────────
  console.log('📍 addresses');
  await ensureIndex('addresses', { customerId: 1, isDeleted: 1, isDefault: 1 });         // Default address lookup

  // ─── CATEGORIES ────────────────────────────────────────────
  console.log('📂 categories');
  await ensureIndex('categories', { name: 1 });                                          // Name lookup
  await ensureIndex('categories', { isActive: 1, isDeleted: 1 });                        // Active categories

  // ─── ADMINS ────────────────────────────────────────────────
  console.log('🔐 admins');
  await ensureIndex('admins', { isDeleted: 1 });                                         // Soft-delete filter

  // ═══════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════════');
  console.log(`  DONE — ${created} indexes created, ${skipped} skipped (conflicts)`);
  console.log('════════════════════════════════════════════════\n');

  // Print final index count per collection
  console.log('📊 Final Index Counts:');
  const collections = await db.listCollections().toArray();
  for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const indexes = await db.collection(col.name).indexes();
    console.log(`  ${col.name}: ${indexes.length} indexes`);
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

