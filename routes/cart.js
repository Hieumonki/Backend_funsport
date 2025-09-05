const router = require("express").Router();
const cartController = require("../controllers/cart");
const auth = require("../middlewares/auth");

// ➕ Thêm vào giỏ
router.post("/add", auth, cartController.addToCart);

// 📦 Lấy giỏ hàng user
router.get("/", auth, cartController.getCart);

// ❌ Xoá 1 item trong giỏ
router.delete("/remove", auth, cartController.removeFromCart);

module.exports = router;
