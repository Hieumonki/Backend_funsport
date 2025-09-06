const router = require("express").Router();
const { addToCart, getCart, removeFromCart } = require("../controllers/cart");
const { varifyToken } = require("../controllers/middlewareConza"); // ✅ destructure

router.post("/add", varifyToken, addToCart);
router.get("/", varifyToken, getCart);
router.post("/remove", varifyToken, removeFromCart);

module.exports = router;
