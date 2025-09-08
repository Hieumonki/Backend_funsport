const productCon = require("../controllers/productCon");
const router = require("express").Router();
const multer = require("multer");

// Cấu hình lưu file ảnh
const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "uploads/");
  },
  filename: function (req, file, callback) {
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1000) +
      "." +
      fileExtension;
    callback(null, uniqueFileName);
  },
});

const upload = multer({ storage });

// 📊 API thống kê
router.get("/stats", productCon.getProductStats);

// 🔀 Lấy sản phẩm ngẫu nhiên
router.get("/random/products", productCon.getRandomProducts);

// ➕ Thêm sản phẩm (cho phép up tới 5 ảnh)
// body gửi kèm: name, desc, category, tab, describe, author, variants[]
router.post("/", upload.array("image", 5), productCon.addproduct);

// 📦 Lấy toàn bộ sản phẩm
router.get("/", productCon.getAllproduct);

// 🔍 Lấy chi tiết 1 sản phẩm
router.get("/:id", productCon.getAnproduct);

// ✏️ Cập nhật sản phẩm
router.put("/:id", upload.array("image", 5), productCon.updateproduct);

// 🗑️ Xóa sản phẩm
router.delete("/:id", productCon.deleteproduct);

// 👤 Lấy sản phẩm theo user
router.get("/user/:userId", productCon.getProductsByUser);

module.exports = router;
