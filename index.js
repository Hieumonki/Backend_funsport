const productsellRouter = require("./routes/productsell");
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
var bodyParser = require("body-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
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


// addimage
const multer = require("multer");
const path = require("path");
const { url } = require("inspector");
const axios = require("axios");
app.use(express.json());
// Cấu hình Multer để lưu tệp vào thư mục 'uploads'
const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "uploads/");
  },
  filename: function (req, file, callback) {
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName =
      Date.now() + "-" + Math.round(Math.random() * 1000) + "." + fileExtension;

    callback(null, uniqueFileName);
  },
});

const upload = multer({ storage });

// addimage

dotenv.config();
//connect

mongoose
  .connect(process.env.MONGOOSE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Kết nối thành công đến MongoDB");
  })
  .catch((error) => {
    console.error("Lỗi kết nối MongoDB:", error);
  });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(cors());
app.options('*', cors());
app.use(morgan("common"));
app.use("/uploads", express.static("uploads"));
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

categoryRouter
app.listen(8000, () => {
  console.log("sevver đang chạy");
});

app.post("/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Vui lòng tải lên một tệp ảnh." });
  }

  const imagePath = req.file.filename;
  res.status(200).json({ imagePath });
});
app.get("/view-image/:filename", (req, res) => {
  const { filename } = req.params;
  res.sendFile(path.join(__dirname, "uploads", filename));
});

app.post("/v1/payment", async (req, res) => {
  try {
    const { cart, customerInfo, redirectUrl } = req.body;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }

    // Tính tổng tiền
    const amount = cart.reduce((sum, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      return sum + price * quantity;
    }, 0);

    // Thông tin MoMo
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const requestType = "payWithMethod";
    const orderId = partnerCode + new Date().getTime();
    const requestId = orderId;
    const orderInfo = 'Thanh toán đơn hàng FunSport';
    const extraData = Buffer.from(JSON.stringify({ cart, customerInfo })).toString('base64');
    const orderGroupId = '';
    const autoCapture = true;
    const lang = 'vi';
    const ipnUrl = `${process.env.BACKEND_URL}/v1/payment-notify`;

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: "FunSport",
      storeId: "FunSportStore",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      orderGroupId,
      signature
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req2 = https.request(options, res2 => {
      let body = '';
      res2.on('data', chunk => body += chunk);
      res2.on('end', () => {
        try {
          const momoRes = JSON.parse(body);
          return res.status(200).json(momoRes); // trả về payUrl cho frontend
        } catch (err) {
          return res.status(500).json({ message: "Lỗi parse response MoMo" });
        }
      });
    });

    req2.on('error', e => {
      return res.status(500).json({ message: "Lỗi request tới MoMo", error: e.message });
    });

    req2.write(requestBody);
    req2.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});


const { order } = require("./model/model");

app.post("/payment-notify", express.json(), async (req, res) => {
  const data = req.body;
  console.log("📩 Nhận IPN từ MoMo:", data);

  if (data.resultCode === 0) {
    try {
      const orderData = {
        orderId: data.orderId,
        amount: data.amount,
        requestId: data.requestId,
        transId: data.transId,
        orderInfo: data.orderInfo,
        payType: data.payType,
        signature: data.signature,
        time: new Date(),
      };

      await order.create(orderData);
      return res.status(200).json({ message: "✅ Đơn hàng đã được lưu vào MongoDB" });

    } catch (error) {
      console.error("❌ Lỗi khi lưu đơn hàng:", error);
      return res.status(500).json({ message: "Lỗi server khi lưu đơn hàng" });
    }

  } else {
    return res.status(400).json({ message: "❌ Giao dịch thất bại từ MoMo", data });
  }
});




