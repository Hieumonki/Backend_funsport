const express = require('express');
const router = express.Router();
const bestSellerController = require('../controllers/bestsellerCon');

// API: GET /v1/bestseller
router.get('/', bestSellerController.getAllBestSellers);

module.exports = router;
