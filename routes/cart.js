const router = require("express").Router();
const { addToCart, getCart, removeFromCart,decreaseFromCart } = require("../controllers/cart");
const { varifyToken } = require("../controllers/middlewareCon"); // ✅ destructure

router.post("/add", varifyToken, addToCart);
router.get("/", varifyToken, getCart);
router.post("/remove", varifyToken, removeFromCart);
router.post("/decrease", varifyToken, decreaseFromCart);

module.exports = router;
