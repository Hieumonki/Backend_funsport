const express = require('express');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteCon.js');
const { varifyToken } = require('../controllers/middlewareCon.js');

const router = express.Router();

router.get('/', varifyToken, getFavorites);
router.post('/', varifyToken, addFavorite);
router.delete('/:id', varifyToken, removeFavorite);

module.exports = router;
