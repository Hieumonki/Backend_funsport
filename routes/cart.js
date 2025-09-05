const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart");

// Lấy giỏ hàng
router.get("/", cartController.getCart);

// Thêm sản phẩm vào giỏ
router.post("/", cartController.addToCart);

// Xóa sản phẩm khỏi giỏ
router.delete("/:id", cartController.removeFromCart);

module.exports = router;
