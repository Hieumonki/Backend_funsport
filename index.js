const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
var bodyParser = require("body-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const crypto = require('crypto');
const https = require('https');
const axios = require("axios");

dotenv.config();

// Import routes
const productsellRouter = require("./routes/productsell");
const authorRouter = require("./routes/author");
const themeRouter = require("./routes/theme");
const accountRouter = require("./routes/account");
const userRouter = require("./routes/user");
const categoryRouter = require("./routes/category");
const productRouter = require("./routes/product");
const statsRouter = require('./routes/stats');
const newsRoutes = require('./routes/news.routes');
const orderRoutes = require('./routes/order.routes');
const bestSellerRoute = require('./routes/bestseller');
const contactRouter = require('./routes/contact');
const favoriteRoutes = require("./routes/favorite");

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  origin: ["https://funsport.click"],
  credentials: true,
}));

app.options('*', cors());
app.use(morgan("common"));

// Kết nối MongoDB
mongoose.connect(process.env.MONGOOSE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Kết nối thành công đến MongoDB");
}).catch((error) => {
  console.error("Lỗi kết nối MongoDB:", error);
});

// Cấu hình multer upload ảnh
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

// Public folder uploads
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/v1/author", authorRouter);
app.use("/v1/theme", themeRouter);
app.use("/v1/account", accountRouter);
app.use("/v1/user", userRouter);
app.use("/v1/category", categoryRouter);
app.use("/v1/product", productRouter);
app.use("/v1/productsell", productsellRouter);
app.use('/v1/stats', statsRouter);
app.use('/v1/orders', orderRoutes);
app.use('/v1/news', newsRoutes);
app.use('/v1/contact', contactRouter);
app.use('/v1/bestseller', bestSellerRoute);
app.use("/v1/favorites", favoriteRoutes);
// Upload ảnh (keep this for standalone uploads if needed)
app.post("/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Vui lòng tải lên một tệp ảnh." });
  }
  const imagePath = req.file.filename;
  res.status(200).json({ imagePath });
});

// Xem ảnh
app.get("/view-image/:filename", (req, res) => {
  const { filename } = req.params;
  res.sendFile(path.join(__dirname, "uploads", filename));
});

/* ===================== MoMo Test Payment ===================== */
app.post("/v1/orders/momo-pay", async (req, res) => {
  try {
    const { amount, orderInfo } = req.body;

    // MoMo test credentials
    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + Date.now();
    const orderId = requestId;
    const redirectUrl = process.env.MOMO_REDIRECT_URL;
    const ipnUrl = process.env.MOMO_IPN_URL;

    const requestType = "captureWallet";
    const extraData = "";

    // Tạo raw signature
    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    // Ký HMAC SHA256
    const signature = crypto.createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

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

    // Gửi request tới MoMo test
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

    const request = https.request(options, (momoRes) => {
      let data = "";
      momoRes.on("data", (chunk) => {
        data += chunk;
      });
      momoRes.on("end", () => {
        const jsonData = JSON.parse(data);
        return res.json(jsonData); // Trả về payUrl cho FE
      });
    });

    request.on("error", (e) => {
      console.error(e);
      res.status(500).json({ error: "Không thể tạo thanh toán MoMo" });
    });

    request.write(JSON.stringify(requestBody));
    request.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// MoMo IPN
app.post("/v1/orders/momo-ipn", (req, res) => {
  console.log("MoMo IPN:", req.body);
  res.status(204).send(); // MoMo yêu cầu trả 204
});
/* ============================================================= */

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
