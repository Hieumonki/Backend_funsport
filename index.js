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
const orderRoutes = require('./routes/order.routes');
const bestSellerRoute = require('./routes/bestseller');

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

app.post("/payment", async (req, res) => {
  //https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
  //parameters
  var accessKey = 'F8BBA842ECF85';
  var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
  var orderInfo = 'pay with MoMo';
  var partnerCode = 'MOMO';
  var redirectUrl = 'http://localhost:4200/payment-success';
  var ipnUrl = 'http://localhost:8000/payment-notify';
  var requestType = "payWithMethod";
  var amount = '50000';
  var orderId = partnerCode + new Date().getTime();
  var requestId = orderId;
  var extraData = '';
  var paymentCode = 'T8Qii53fAXyUftPV3m9ysyRhEanUs9KlOPfHgpMR0ON50U10Bh+vZdpJU7VY4z+Z2y77fJHkoDc69scwwzLuW5MzeUKTwPo3ZMaB29imm6YulqnWfTkgzqRaion+EuD7FN9wZ4aXE1+mRt0gHsU193y+yxtRgpmY7SDMU9hCKoQtYyHsfFR5FUAOAKMdw2fzQqpToei3rnaYvZuYaxolprm9+/+WIETnPUDlxCYOiw7vPeaaYQQH0BF0TxyU3zu36ODx980rJvPAgtJzH1gUrlxcSS1HQeQ9ZaVM1eOK/jl8KJm6ijOwErHGbgf/hVymUQG65rHU2MWz9U8QUjvDWA==';
  var orderGroupId = '';
  var autoCapture = true;
  var lang = 'vi';

  //before sign HMAC SHA256 with format
  //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
 var rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  //puts raw signature
  console.log("--------------------RAW SIGNATURE----------------")
  console.log(rawSignature)
  //signature
  const crypto = require('crypto');
  var signature = crypto.createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');
  console.log("--------------------SIGNATURE----------------")
  console.log(signature)

  //json object send to MoMo endpoint
  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    lang: lang,
    requestType: requestType,
    autoCapture: autoCapture,
    extraData: extraData,
    orderGroupId: orderGroupId,
    signature: signature
  });
  //Create the HTTPS objects
  const https = require('https');
  const options = {
    hostname: 'test-payment.momo.vn',
    port: 443,
    path: '/v2/gateway/api/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    }
  }
  //Send the request and get the response
  const req2 = https.request(options, res2 => {
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res2.headers)}`);
    res2.setEncoding('utf8');
    res2.on('data', (body) => {
      console.log('Body: ');
  console.log(body);

  const parsed = JSON.parse(body);

  // ✅ Gửi phản hồi lại cho Angular
  res.status(200).json(parsed);
    });
    res2.on('end', () => {
      console.log('No more data in response.');
    });
  })

  req2.on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
  });
  // write data to request body
  console.log("Sending....")
  req2.write(requestBody);
  req2.end();
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


const newsRoutes = require('./routes/news.routes');
app.use('/v1/news', newsRoutes);
app.use('/v1/bestseller', bestSellerRoute);
