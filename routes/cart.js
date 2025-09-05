const router = require("express").Router();
const cartController = require("../controllers/cart");

router.post("/add", cartController.addToCart);
router.get("/:userId", cartController.getCart);
router.delete("/:id", cartController.removeItem);

module.exports = router;
