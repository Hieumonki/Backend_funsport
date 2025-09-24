const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

// Khởi tạo app
const app = express();
dotenv.config();

/* ===================== Middleware ===================== */
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(cors());
app.options("*", cors());
app.use(morgan("common"));

/* ===================== MongoDB Connection ===================== */
mongoose
  .connect(process.env.MONGOOSE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Kết nối thành công đến MongoDB"))
  .catch((error) => console.error("❌ Lỗi kết nối MongoDB:", error));

/* ===================== Multer Upload Config ===================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

/* ===================== Import Routes ===================== */
const productsellRouter = require("./routes/productsell");
const authorRouter = require("./routes/author");
const themeRouter = require("./routes/theme");
const accountRouter = require("./routes/account");
const userRouter = require("./routes/user");
const categoryRouter = require("./routes/category");
const productRouter = require("./routes/product");
const statsRouter = require("./routes/stats");
const newsRoutes = require("./routes/news.routes");
const orderRoutes = require("./routes/order.routes");
const bestSellerRoute = require("./routes/bestseller");
const contactRouter = require("./routes/contact");
const favoriteRoutes = require("./routes/favorite");
const cartRoutes = require("./routes/cart");

/* ===================== Routes ===================== */
app.use("/v1/author", authorRouter);
app.use("/v1/theme", themeRouter);
app.use("/v1/account", accountRouter);
app.use("/v1/user", userRouter);
app.use("/v1/category", categoryRouter);
app.use("/v1/product", productRouter);
app.use("/v1/productsell", productsellRouter);
app.use("/v1/stats", statsRouter);
app.use("/v1/orders", orderRoutes);
app.use("/v1/news", newsRoutes);
app.use("/v1/cart", cartRoutes);
app.use("/v1/contact", contactRouter);
app.use("/v1/bestsellers", require("./routes/bestseller"));
app.use("/v1/favorites", favoriteRoutes);

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Upload ảnh riêng lẻ
app.post("/uploads", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Vui lòng tải lên một tệp ảnh." });
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(200).json({ imageUrl });
});

// Xem ảnh
app.get("/view-image/:filename", (req, res) => {
  res.sendFile(path.join(__dirname, "uploads", req.params.filename));
});

// Health check
app.get("/ping", (req, res) => res.status(200).send("OK"));

/* ===================== MoMo Payment ===================== */
app.post("/v1/orders/momo-pay", async (req, res) => {
  try {
    const { amount, orderInfo } = req.body;

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + Date.now();
    const orderId = requestId;
    const redirectUrl = "http://localhost:4200/payment-success";
    const ipnUrl = "http://localhost:8000/v1/orders/momo-ipn";
    const requestType = "captureWallet";
    const extraData = "";

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const requestBody = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: "vi",
    };

    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(requestBody)),
      },
    };

    const momoReq = https.request(options, (momoRes) => {
      let data = "";
      momoRes.on("data", (chunk) => (data += chunk));
      momoRes.on("end", () => res.json(JSON.parse(data)));
    });

    momoReq.on("error", (e) => {
      console.error(e);
      res.status(500).json({ error: "Không thể tạo thanh toán MoMo" });
    });

    momoReq.write(JSON.stringify(requestBody));
    momoReq.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// MoMo IPN
app.post("/v1/orders/momo-ipn", (req, res) => {
  console.log("MoMo IPN:", req.body);
  res.status(204).send();
});

/* ===================== Server Start ===================== */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
