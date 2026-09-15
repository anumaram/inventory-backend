const express = require('express');
const adminAuth = require('../middleware/admin.middleware');
const adminService = require('../services/admin.service');
const ext = require('../services/admin-extended.service');

const router = express.Router();

// 1. Auth & OTP
router.post('/login', adminService.login);
router.post('/login-otp/request', ext.requestLoginOtp);
router.post('/login-otp/verify', ext.verifyLoginOtp);
router.get('/contact', adminService.getContact);

// 2. Dashboard & Overview
router.get('/overview', adminAuth, adminService.getOverview);
router.get('/dashboard-data', adminAuth, ext.getDashboardData);

// 3. Customers
router.get('/customers', adminAuth, ext.getCustomersList);
router.get('/customers/:id', adminAuth, ext.getCustomerDetails);
router.patch('/customers/:id', adminAuth, adminService.updateCustomer);
router.delete('/customers/:id', adminAuth, adminService.deleteCustomer);
router.post('/customers/:id/toggle-block', adminAuth, ext.toggleCustomerBlock);
router.post('/customers/:id/adjust-wallet', adminAuth, ext.adjustCustomerWallet);

// 4. Vendors
router.get('/vendors', adminAuth, ext.getVendorsList);
router.patch('/vendors/:id', adminAuth, adminService.updateVendor);
router.delete('/vendors/:id', adminAuth, adminService.deleteVendor);
router.patch('/vendors/:id/status', adminAuth, ext.updateVendorStatus);

// 5. Products & Categories
router.get('/products', adminAuth, adminService.getProducts);
router.patch('/products/:id', adminAuth, adminService.updateProduct);
router.delete('/products/:id', adminAuth, adminService.deleteProduct);

router.get('/categories', adminAuth, ext.getCategories);
router.post('/categories', adminAuth, ext.createCategory);
router.patch('/categories/:id', adminAuth, ext.updateCategory);
router.delete('/categories/:id', adminAuth, ext.deleteCategory);

// 6. Orders & Tracking
router.get('/orders', adminAuth, ext.getOrdersList);
router.patch('/orders/:id/status', adminAuth, ext.updateOrderStatus);

// 7. Inventory & Warehouses & Transfers
router.get('/inventory/overview', adminAuth, ext.getInventoryOverview);
router.get('/inventory/history', adminAuth, ext.getStockHistory);
router.get('/warehouses', adminAuth, ext.getWarehouses);
router.post('/warehouses', adminAuth, ext.createWarehouse);
router.get('/transfers', adminAuth, ext.getTransfers);
router.post('/transfers', adminAuth, ext.createTransfer);

// 8. Returns & Refunds
router.get('/returns', adminAuth, ext.getReturnsList);
router.post('/refunds/process', adminAuth, ext.processRefund);

// 9. Transactions & Invoices & Wallets
router.get('/transactions', adminAuth, ext.getAllTransactions);
router.get('/invoices', adminAuth, ext.getInvoicesList);
router.get('/wallets', adminAuth, ext.getWalletsSummary);

// 10. Marketing: Coupons, Promotions & Banners
router.get('/coupons', adminAuth, ext.getCoupons);
router.post('/coupons', adminAuth, ext.createCoupon);
router.patch('/coupons/:id', adminAuth, ext.updateCoupon);
router.delete('/coupons/:id', adminAuth, ext.deleteCoupon);
router.get('/promotions', adminAuth, ext.getPromotions);
router.post('/promotions', adminAuth, ext.createPromotion);
router.delete('/promotions/:id', adminAuth, ext.deletePromotion);
router.get('/banners', adminAuth, ext.getBanners);
router.post('/banners', adminAuth, ext.createBanner);
router.patch('/banners/:id', adminAuth, ext.updateBanner);
router.delete('/banners/:id', adminAuth, ext.deleteBanner);

// 11. Reviews Moderation & Support Tickets
router.get('/reviews', adminAuth, ext.getReviewsList);
router.patch('/reviews/:id', adminAuth, ext.moderateReview);
router.get('/support-tickets', adminAuth, ext.getSupportTickets);
router.post('/support-tickets/:id/reply', adminAuth, ext.replySupportTicket);

// 12. Notifications Broadcast
router.get('/notifications', adminAuth, ext.getNotificationsList);
router.post('/notifications/broadcast', adminAuth, ext.broadcastNotification);

// 13. Analytics & Reports
router.get('/analytics/sales', adminAuth, ext.getSalesAnalytics);
router.get('/analytics/customers', adminAuth, ext.getCustomerAnalytics);
router.get('/analytics/vendors', adminAuth, ext.getVendorAnalytics);
router.get('/analytics/inventory', adminAuth, ext.getInventoryAnalytics);
router.get('/reports/generate', adminAuth, ext.generateReport);

// 14. Admin Users, Roles & Permissions
router.get('/admin-users', adminAuth, ext.getAdminUsers);
router.post('/admin-users', adminAuth, ext.createAdminUser);
router.post('/admin-users/:id/password-otp', adminAuth, ext.requestAdminPasswordOtp);
router.patch('/admin-users/:id', adminAuth, ext.updateAdminUser);
router.post('/admin-users/:id/toggle-block', adminAuth, ext.toggleAdminBlock);
router.delete('/admin-users/:id', adminAuth, ext.deleteAdminUser);
router.get('/roles', adminAuth, ext.getAdminRoles);
router.post('/roles', adminAuth, ext.createAdminRole);
router.patch('/roles/:id', adminAuth, ext.updateAdminRole);

// 15. Security & Activity Monitoring
router.get('/security', adminAuth, ext.getSecurityOverview);
router.get('/activity', adminAuth, ext.getActivityFeed);

// 16. Global Search
router.get('/global-search', adminAuth, ext.globalSearch);

// 17. Audit Logs & Settings
router.get('/audit-logs', adminAuth, ext.getAuditLogs);
router.get('/settings', adminAuth, ext.getStoreSettings);
router.patch('/settings', adminAuth, ext.updateStoreSettings);

// 18. System Health
router.get('/system-health', adminAuth, ext.getSystemHealth);

// 19. Monthly & Scheduled Email Triggers
router.post('/emails/trigger-vendor-monthly', adminAuth, ext.triggerMonthlyVendorEmails);
router.post('/emails/trigger-admin-monthly', adminAuth, ext.triggerMonthlyAdminEmail);
router.post('/emails/trigger-scheduled', adminAuth, ext.triggerScheduledEmails);

// Legacy compatibility
router.get('/wishlist', adminAuth, adminService.getWishlist);
router.get('/cart', adminAuth, adminService.getCart);

module.exports = router;
