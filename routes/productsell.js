const productSellCon = require("../controllers/productsellCon"); 
const router = require("express").Router();



router.post("/", productSellCon.addProductSell);
router.get("/", productSellCon.getAllProductSell);
router.get("/:id", productSellCon.getOneProductSell);
router.put("/:id", productSellCon.updateProductSell);
router.delete("/:id", productSellCon.deleteProductSell);

module.exports = router;
