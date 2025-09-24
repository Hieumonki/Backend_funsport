const express = require('express');
const router = express.Router();
const bestsellerCon = require('../controllers/bestsellerCon');

// Chỉ GET & POST (giống product)
router.get('/', bestsellerCon.getAllBestSellers);
router.get('/:id', bestsellerCon.getBestSellerById);
router.post('/', bestsellerCon.createBestSeller);

module.exports = router;
