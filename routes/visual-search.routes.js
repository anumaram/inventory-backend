const express = require('express');
const router = express.Router();
const visualSearchService = require('../services/visual-search.service');

router.post('/', visualSearchService.searchByImage);
router.post('/search', visualSearchService.searchByImage);

module.exports = router;
