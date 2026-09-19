const express = require('express');
const router = express.Router();
const optionalCustomerAuth = require('../middleware/optionalCustomerAuth');
const avatarService = require('../services/avatar.service');

router.get('/', optionalCustomerAuth, avatarService.getMyAvatar);
router.get('/me', optionalCustomerAuth, avatarService.getMyAvatar);
router.put('/profile', optionalCustomerAuth, avatarService.updateAvatarProfile);
router.post('/equip', optionalCustomerAuth, avatarService.equipProduct);
router.post('/looks', optionalCustomerAuth, avatarService.saveLook);
router.post('/save-look', optionalCustomerAuth, avatarService.saveLook);
router.delete('/look/:lookId', optionalCustomerAuth, avatarService.deleteSavedLook);
router.delete('/looks/:lookId', optionalCustomerAuth, avatarService.deleteSavedLook);
router.get('/apparel', avatarService.getDressCatalog);
router.get('/catalog', avatarService.getDressCatalog);
router.get('/templates', avatarService.getAvatarTemplates);
router.get('/items', avatarService.getBitmojiWardrobe);
router.post('/vton-tryon', avatarService.processVtonTryon);
router.post('/reblend', optionalCustomerAuth, avatarService.aiReblendFit);

module.exports = router;
