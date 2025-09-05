const router = require("express").Router();
const { addToCart, getCart, removeFromCart } = require("../controllers/cart");
const auth = require("../controllers/middlewareCon"); // middleware xác thực token

// các route cần login
router.post("/add", auth, addToCart);
router.get("/", auth, getCart);
router.post("/remove", auth, removeFromCart);

module.exports = router;
