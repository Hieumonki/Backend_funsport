const productCon = require("../controllers/productCon");
const router = require("express").Router();
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "uploads/");
  },
  filename: function (req, file, callback) {
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName = Date.now() + "-" + Math.round(Math.random() * 1000) + "." + fileExtension;
    callback(null, uniqueFileName);
  },
});
const upload = multer({ storage });

router.get("/stats", productCon.getProductStats);
router.get("/random/products", productCon.getRandomProducts);
router.post("/", upload.array('image', 5), productCon.addproduct);  // Added multer for image uploads (up to 5)
router.get("/", productCon.getAllproduct);
router.get("/:id", productCon.getAnproduct);
router.put("/:id", productCon.updateproduct);
router.delete("/:id", productCon.deleteproduct);
router.get("/user/:userId", productCon.getProductsByUser);

module.exports = router;