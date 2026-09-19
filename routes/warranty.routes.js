const express = require('express');
const router = express.Router();
const optionalCustomerAuth = require('../middleware/optionalCustomerAuth');
const warrantyService = require('../services/warranty.service');

router.get('/', optionalCustomerAuth, warrantyService.getMyWarranties);
router.get('/claims', optionalCustomerAuth, warrantyService.getMyClaims);
router.get('/vendor/claims', warrantyService.getVendorClaims);
router.get('/admin/claims', warrantyService.getAdminClaims);
router.get('/claims/:claimId', warrantyService.getClaimById);
router.patch('/claims/:claimId/status', warrantyService.updateClaimStatus);
router.put('/claims/:claimId/status', warrantyService.updateClaimStatus);
router.get('/:id', optionalCustomerAuth, warrantyService.getWarrantyById);
router.post('/claim', optionalCustomerAuth, warrantyService.raiseWarrantyClaim);
router.post('/claims', optionalCustomerAuth, warrantyService.raiseWarrantyClaim);
router.post('/register', optionalCustomerAuth, warrantyService.registerWarranty);

module.exports = router;

