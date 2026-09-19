const express = require('express');
const router = express.Router();
const customerAuth = require('../middleware/customer.middleware');
const auth = require('../middleware/auth.middleware');
const adminAuth = require('../middleware/admin.middleware');
const ticketService = require('../services/ticket.service');

// ==========================================
// 1. CUSTOMER TICKETS ROUTES
// ==========================================
router.get('/my', customerAuth, ticketService.getMyTickets);
router.post('/', customerAuth, ticketService.createCustomerTicket);
router.get('/:id', customerAuth, ticketService.getTicketById);
router.post('/:id/reply', customerAuth, ticketService.replyTicket);
router.patch('/:id/close', customerAuth, ticketService.resolveOrCloseTicket);

// ==========================================
// 2. VENDOR TICKETS ROUTES
// ==========================================
router.get('/vendor/list', auth, ticketService.getVendorTickets);
router.post('/vendor/create', auth, ticketService.createVendorTicket);
router.post('/vendor/:id/reply', auth, ticketService.replyTicket);
router.patch('/vendor/:id/resolve', auth, ticketService.resolveOrCloseTicket);

// ==========================================
// 3. ADMIN TICKETS ROUTES
// ==========================================
router.get('/admin/list', adminAuth, ticketService.getAdminTickets);
router.post('/admin/:id/reply', adminAuth, ticketService.replyTicket);
router.patch('/admin/:id/resolve', adminAuth, ticketService.resolveOrCloseTicket);
router.post('/admin/:id/ai-analyze', adminAuth, ticketService.adminAiAnalyzeTicket);

module.exports = router;
