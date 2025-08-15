// controllers/order.js
const crypto = require('crypto');
const axios = require('axios');

const Order = require('../model/order');                 // Model Order riêng
const { product: Product } = require('../model/model');  // Product từ model chung

// 📌 Tạo đơn hàng và trả link MoMo test
const createOrderAndPayWithMoMo = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    if (!customerInfo?.fullName || !customerInfo?.phone) {
      return res.status(400).json({ message: 'Thiếu thông tin khách hàng (fullName, phone)' });
    }

    // Lấy dữ liệu sản phẩm từ DB để bổ sung name & price
    const detailedCartItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
        }
        return {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity || 1
        };
      })
    );

    const orderCode = 'TEST-' + Date.now();

    // Tạo order trong DB
    const newOrder = await Order.create({
      orderId: orderCode,
      cartItems: detailedCartItems,
      customerInfo,
      amount,
      payment: payment || 'momo_test',
      status: 'pending',
      createdAt: new Date()
    });

    // ===== MoMo Test Config =====
    const endpoint = 'https://test-payment.momo.vn/v2/gateway/api/create';
    const partnerCode = 'MOMO';
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const requestId = orderCode;
    const orderId = orderCode;
    const orderInfo = `Thanh toán đơn hàng test ${orderCode}`;
    const redirectUrl = 'http://localhost:4200/payment-success'; // frontend
    const ipnUrl = 'http://localhost:3000/api/momo-ipn';        // backend nhận IPN
    const extraData = '';

    // Tạo chữ ký HMAC-SHA256
    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=captureWallet`;

    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    // Body gửi MoMo
    const requestBody = {
      partnerCode,
      accessKey,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType: 'captureWallet',
      signature,
      lang: 'vi'
    };

    // Gửi request tới MoMo Test
    const momoRes = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (momoRes.data?.payUrl) {
      return res.status(201).json({
        message: 'Tạo đơn hàng test thành công',
        order: newOrder,
        payUrl: momoRes.data.payUrl
      });
    } else {
      return res.status(500).json({ message: 'Không tạo được link thanh toán MoMo test' });
    }

  } catch (err) {
    console.error('❌ Lỗi khi tạo đơn hàng MoMo:', err);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng: ' + err.message });
  }
};

// 📌 MoMo IPN handler
const momoIpnHandler = async (req, res) => {
  try {
    console.log('📥 Nhận IPN từ MoMo:', req.body);
    // TODO: cập nhật trạng thái đơn hàng trong DB
    res.status(200).json({ message: 'IPN nhận thành công' });
  } catch (err) {
    console.error('❌ Lỗi IPN MoMo:', err);
    res.status(500).json({ message: 'Lỗi IPN MoMo: ' + err.message });
  }
};

module.exports = {
  createOrderAndPayWithMoMo,
  momoIpnHandler,
};
