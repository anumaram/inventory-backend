const express = require('express');
const router = express.Router();
const optionalCustomerAuth = require('../middleware/optionalCustomerAuth');
const sharedCartService = require('../services/shared-cart.service');

router.get('/', optionalCustomerAuth, sharedCartService.getMySharedCarts);
router.get('/my', optionalCustomerAuth, sharedCartService.getMySharedCarts);
router.post('/', optionalCustomerAuth, sharedCartService.createSharedCart);
router.post('/create', optionalCustomerAuth, sharedCartService.createSharedCart);
router.post('/join', optionalCustomerAuth, sharedCartService.joinSharedCart);
router.post('/:cartId/items', optionalCustomerAuth, sharedCartService.addItemToCart);
router.post('/:cartId/items/:itemId/vote', optionalCustomerAuth, sharedCartService.voteOnItem);
router.post('/:cartId/items/:itemId/comment', optionalCustomerAuth, sharedCartService.addCommentToItem);
router.put('/:cartId/items/:itemId', optionalCustomerAuth, sharedCartService.updateItemQuantity);
router.post('/:cartId/messages', optionalCustomerAuth, sharedCartService.postMessage);
router.put('/:cartId/ready', optionalCustomerAuth, sharedCartService.toggleReadyStatus);
router.delete('/:cartId/items/:itemId', optionalCustomerAuth, sharedCartService.removeItemFromCart);
router.get('/:idOrCode', optionalCustomerAuth, sharedCartService.getSharedCart);

module.exports = router;
