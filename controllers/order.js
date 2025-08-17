// controllers/order.js

const crypto = require('crypto');
const axios = require('axios');
const Order = require('../model/order.js');
const { product: Product } = require('../model/model.js');

/**
 * 📌 Tạo đơn hàng + trả link MoMo test
 */
const createOrderAndPayWithMoMo = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;
    const userId = req.user?.id; // 👈 lấy từ middleware auth

    if (!userId) return res.status(401).json({ message: 'Bạn phải đăng nhập để đặt hàng' });
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }
    if (!customerInfo?.fullName || !customerInfo?.phone) {
      return res.status(400).json({ message: 'Thiếu thông tin khách hàng (fullName, phone)' });
    }

    // Lấy chi tiết sản phẩm từ DB
    const detailedCartItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) throw new Error(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
        return {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity || 1,
          image: product.image
        };
      })
    );

    const orderCode = 'ORD-' + Date.now();

    // ✅ Lưu đơn hàng vào DB
    const newOrder = await Order.create({
      orderId: orderCode,
      userId, // 👈 Lưu userId
      cartItems: detailedCartItems,
      customerInfo,
      amount,
      payment: payment || 'momo_test',
      status: 'pending',
      isLocked: false,
      createdAt: new Date()
    });

    // ===== MoMo Test Config =====
    const endpoint = 'https://test-payment.momo.vn/v2/gateway/api/create';
    const partnerCode = 'MOMO';
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const requestId = orderCode;
    const orderId = orderCode;
    const orderInfo = `Thanh toán đơn hàng ${orderCode}`;
    const redirectUrl = 'http://localhost:4200/home';
    const ipnUrl = 'http://localhost:3000/api/momo-ipn';
    const extraData = '';
    const requestType = 'payWithMethod';

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      autoCapture: true,
      signature,
      lang: 'vi'
    };

    const momoRes = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    return res.status(201).json({
      message: 'Tạo đơn hàng thành công',
      order: newOrder,
      payUrl: momoRes.data?.payUrl || null
    });
  } catch (err) {
    console.error('❌ Lỗi khi tạo đơn hàng MoMo:', err);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng: ' + err.message });
  }
};

/**
 * 📌 MoMo IPN handler
 */
const momoIpnHandler = async (req, res) => {
  try {
    console.log('📥 Nhận IPN từ MoMo:', req.body);
    res.status(200).json({ message: 'IPN nhận thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi IPN MoMo: ' + err.message });
  }
};

/**
 * 📌 Lấy tất cả đơn hàng (cho admin)
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'cartItems.productId',
        select: 'name price category image',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * 📌 Lấy đơn hàng theo user đang đăng nhập
 */
const getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate({
        path: 'cartItems.productId',
        select: 'name price category image',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

/**
 * 📌 Lấy đơn hàng theo mã orderId
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate({
        path: 'cartItems.productId',
        populate: { path: 'category', model: 'category' }
      });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy đơn hàng: ' + err.message });
  }
};

/**
 * 📌 Cập nhật đơn hàng
 */
const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật đơn hàng: ' + err.message });
  }
};

/**
 * 📌 Xóa đơn hàng của user (chỉ cho chủ sở hữu)
 */
const deleteOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id, userId });

    if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });
    res.status(200).json({ message: 'Đã xóa đơn hàng' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa đơn hàng: ' + err.message });
  }
};

/**
 * 📌 Hủy đơn hàng (của user)
 */
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findOne({ orderId: req.params.id, userId });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ message: 'Đơn hàng đã được hủy', order });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi huỷ đơn hàng: ' + err.message });
  }
};

/**
 * 📌 Hủy đơn hàng theo mã (cho admin)
 */
const cancelOrderByCode = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng với mã này' });

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ message: 'Đơn hàng đã được hủy theo mã', order });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

/**
 * 📌 Toggle khóa/mở khóa đơn hàng (cho admin)
 */
const toggleOrderLock = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    order.isLocked = !order.isLocked;
    await order.save();

    res.status(200).json({ message: order.isLocked ? 'Đã khóa đơn hàng' : 'Đã mở khóa đơn hàng' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

/**
 * 📌 Doanh thu theo category
 */
const getRevenueByCategory = async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      { $unwind: '$cartItems' },
      {
        $lookup: {
          from: 'products',
          localField: 'cartItems.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.categoryId',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryInfo.name', 'Không xác định'] },
          totalRevenue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$cartItems.quantity', 0] },
                { $ifNull: ['$cartItems.price', 0] }
              ]
            }
          }
        }
      }
    ]);

    res.json(revenue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createOrderAndPayWithMoMo,
  momoIpnHandler,
  getAllOrders,
  getOrdersByUser,
  getOrderById,
  updateOrder,
  deleteOrder,
  cancelOrder,
  cancelOrderByCode,
  toggleOrderLock,
  getRevenueByCategory
};
