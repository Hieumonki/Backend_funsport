const productCon = require("../controllers/productCon");
const router = require("express").Router();

// ✅ Thêm route thống kê
router.get("/stats", productCon.getProductStats);

// ✅ Thêm route sản phẩm ngẫu nhiên
router.get("/random/products", productCon.getRandomProducts);

// Các route CRUD sản phẩm
router.post("/", productCon.addproduct);
router.get("/", productCon.getAllproduct);
router.get("/:id", productCon.getAnproduct);
router.put("/:id", productCon.updateproduct);
router.delete("/:id", productCon.deleteproduct);

module.exports = router;
