const express = require('express');
const adminAuth = require('../middleware/admin.middleware');
const adminService = require('../services/admin.service');

const router = express.Router();

router.post('/login', adminService.login);
router.get('/overview', adminAuth, adminService.getOverview);

router.get('/vendors', adminAuth, adminService.getVendors);
router.patch('/vendors/:id', adminAuth, adminService.updateVendor);
router.delete('/vendors/:id', adminAuth, adminService.deleteVendor);

router.get('/customers', adminAuth, adminService.getCustomers);
router.patch('/customers/:id', adminAuth, adminService.updateCustomer);
router.delete('/customers/:id', adminAuth, adminService.deleteCustomer);

router.get('/products', adminAuth, adminService.getProducts);
router.patch('/products/:id', adminAuth, adminService.updateProduct);
router.delete('/products/:id', adminAuth, adminService.deleteProduct);

router.get('/orders', adminAuth, adminService.getOrders);
router.get('/wishlist', adminAuth, adminService.getWishlist);
router.get('/cart', adminAuth, adminService.getCart);

module.exports = router;
