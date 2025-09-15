const router = require("express").Router();
const { addToCart, getCart, removeFromCart,decreaseFromCart,clearCart } = require("../controllers/cart");
const { varifyToken } = require("../controllers/middlewareCon"); // ✅ destructure

router.post("/add", varifyToken, addToCart);
router.get("/", varifyToken, getCart);
router.post("/remove", varifyToken, removeFromCart);
router.post("/decrease", varifyToken, decreaseFromCart);
router.post("/clear", varifyToken, clearCart);

module.exports = router;
