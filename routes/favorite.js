const express = require("express");
const router = express.Router();
const { addFavorite, getFavoritesByUser, removeFavorite } = require("../controllers/favorite");
const { varifyToken } = require(".././controllers/middlewareCon");

// User phải đăng nhập mới dùng được
router.post("/", varifyToken, addFavorite);
router.get("/", varifyToken, getFavoritesByUser);
router.delete("/:productId", varifyToken, removeFavorite);

module.exports = router;
