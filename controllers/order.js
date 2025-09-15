// controllers/order.js

const crypto = require('crypto');
const axios = require('axios');
const Cart = require('../model/cart.js');
const Order = require('../model/order.js');
const { product: Product } = require('../model/model.js');

/**
 * 📌 Tạo đơn hàng + trả link MoMo test
 */
const createOrderAndPayWithMoMo = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;
    const userId = req.user?.id || null;

    console.log("📥 Request body:", req.body);

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    // Lấy chi tiết sản phẩm từ DB (có variant)
    const detailedCartItems = await Promise.all(
      cartItems.map(async (item) => {
        console.log("🔎 Đang tìm productId:", item.productId);

        const product = await Product.findById(item.productId);
        if (!product) {
          console.error(`❌ Không tìm thấy sản phẩm với ID: ${item.productId}`);
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
        }

        console.log("✅ Tìm thấy sản phẩm:", product._id, product.name);

        // tìm variant theo size + color từ frontend
        const variant = product.variants.find(
          (v) => v.size === item.size && v.color === item.color
        );

        if (!variant) {
          throw new Error(
            `❌ Không tìm thấy biến thể cho ${product.name} (${item.size}, ${item.color})`
          );
        }

        return {
          productId: product._id,
          name: product.name,
          price: variant.price, // ✅ lấy giá từ variant
          quantity: item.quantity || 1,
          image: Array.isArray(product.image) ? product.image[0] : product.image,
          size: variant.size,
          color: variant.color,
        };
      })
    );

    const orderCode = 'ORD-' + Date.now();

    // ✅ Lưu đơn hàng vào DB
    const newOrder = await Order.create({
      orderId: orderCode,
      userId,
      cartItems: detailedCartItems,
      customerInfo,
      amount,
      payment: payment || 'momo_test',
      status: 'Chờ Xử Lý',
      isLocked: false,
      createdAt: new Date(),
    });

    console.log("📝 Đơn hàng đã lưu:", newOrder);

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

    const signature = crypto
      .createHmac('sha256', secretKey)
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
      lang: 'vi',
    };

    const momoRes = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    return res.status(201).json({
      message: 'Tạo đơn hàng thành công',
      order: newOrder,
      payUrl: momoRes.data?.payUrl || null,
    });
  } catch (err) {
    console.error('❌ Lỗi khi tạo đơn hàng MoMo:', err);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng: ' + err.message });
  }
};
const momoIpnHandler = async (req, res) => {
  try {
    console.log('📥 Nhận IPN từ MoMo:', req.body);

    const { orderId, resultCode } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (resultCode === 0) {
      // ✅ Thanh toán thành công
      order.status = "Đã thanh toán";
      await order.save();

      // ✅ Clear giỏ hàng (không xóa hẳn)
      if (order.userId) {
        let cart = await Cart.findOne({ userId: order.userId });
        if (cart) {
          cart.items = [];
          cart.total = 0;
          await cart.save();
          console.log(`🛒 Đã clear giỏ hàng user ${order.userId}`);
        }
      }
    } else {
      // ❌ Thanh toán thất bại
      order.status = "Thanh toán thất bại";
      await order.save();
      console.log(`⚠️ Thanh toán thất bại cho order ${orderId}`);
    }

    res.status(200).json({ message: "IPN xử lý thành công" });
  } catch (err) {
    console.error("❌ Lỗi IPN MoMo:", err);
    res.status(500).json({ message: "Lỗi IPN MoMo: " + err.message });
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
        select: 'name category image',
        populate: { path: 'category', select: 'name' },
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
        select: 'name category image',
        populate: { path: 'category', select: 'name' },
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
    const order = await Order.findOne({ orderId: req.params.id }).populate({
      path: 'cartItems.productId',
      populate: { path: 'category', model: 'category' },
    });

    if (!order)
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
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

    if (!updatedOrder)
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
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
    const deletedOrder = await Order.findOneAndDelete({
      orderId: req.params.id,
      userId,
    });

    if (!deletedOrder)
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });
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

    if (!order)
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });

    order.status = 'Đã huỷ đơn';
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
    if (!order)
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng với mã này' });

    order.status = 'Đã huỷ đơn';
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
    if (!order)
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    order.isLocked = !order.isLocked;
    await order.save();

    res
      .status(200)
      .json({ message: order.isLocked ? 'Đã khóa đơn hàng' : 'Đã mở khóa đơn hàng' });
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
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.categoryId',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryInfo.name', 'Không xác định'] },
          totalRevenue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$cartItems.quantity', 0] },
                { $ifNull: ['$cartItems.price', 0] },
              ],
            },
          },
        },
      },
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
  getRevenueByCategory,
};
