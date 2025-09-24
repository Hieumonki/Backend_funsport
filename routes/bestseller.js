const router = require("express").Router();
const bestsellerController = require("../controllers/bestsellerCon");

// GET all bestsellers
router.get("/", bestsellerController.getAllBestSellers);

module.exports = router;
