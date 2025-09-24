// controllers/order.js

const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const Cart = require('../model/cart.js');
const Order = require('../model/order.js');
const { product: Product } = require('../model/model.js');

/**
 * Allowed status enum (chỉnh thêm nếu cần)
 */
const ALLOWED_STATUSES = new Set([
  'pending',      // created, chờ xử lý
  'inprogress',   // đang xử lý
  'paid',         // đã thanh toán (momo ipn success)
  'failed',       // thanh toán thất bại (momo)
  'delivered',    // đã giao
  'cancelled',    // đã hủy
  'returned'      // trả hàng / hoàn trả
]);

/**
 * Helper: tìm order bằng orderId (human) hoặc bằng ObjectId (_id)
 */
async function findByOrderIdentifier(identifier) {
  if (!identifier) return null;

  // Nếu identifier là ObjectId valid -> tìm theo _id
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Order.findById(identifier);
    if (byId) return byId;
  }

  // Ngược lại tìm theo orderId field
  return await Order.findOne({ orderId: identifier });
}

/**
 * Helper: sanitize update payload - chỉ cho phép 1 số field cần thiết
 */
function sanitizeUpdatePayload(payload = {}) {
  const allowed = [
    'customerInfo',
    'cartItems',
    'amount',
    'payment',
    'status',
    'shippingMethod',
    'notes',
    'isLocked'
  ];
  const result = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      result[key] = payload[key];
    }
  }
  return result;
}

/**
 * 📌 Tạo đơn hàng + trả link MoMo test
 */
const createOrderAndPayWithMoMo = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;
    const userId = req.user?.id || null;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    // Lấy chi tiết sản phẩm từ DB (có variant)
    const detailedCartItems = await Promise.all(
      cartItems.map(async (item) => {
        if (!item.productId) {
          throw new Error('Missing productId in cart item');
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
        }

        // tìm variant theo size + color từ frontend (nếu có)
        let variant = null;
        if (Array.isArray(product.variants) && (item.size || item.color)) {
          variant = product.variants.find(
            (v) => v.size === item.size && v.color === item.color
          );
        }

        // Nếu không tìm variant, fallback lấy giá gốc product.price (nếu có)
        const price = variant ? variant.price : (product.price || 0);

        return {
          productId: product._id,
          name: product.name,
          price,
          quantity: item.quantity || 1,
          image: Array.isArray(product.image) ? product.image[0] : product.image,
          size: variant ? variant.size : item.size || null,
          color: variant ? variant.color : item.color || null,
        };
      })
    );

    const orderCode = 'ORD-' + Date.now();

    // Lưu đơn hàng vào DB với status tiếng Anh
    const newOrder = await Order.create({
      orderId: orderCode,
      userId,
      cartItems: detailedCartItems,
      customerInfo,
      amount,
      payment: payment || 'momo_test',
      status: 'pending', // chuẩn hóa
      isLocked: false,
      createdAt: new Date(),
    });

    // ===== MoMo Test Config =====
    const endpoint = 'https://test-payment.momo.vn/v2/gateway/api/create';
    const partnerCode = 'MOMO';
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const requestId = orderCode;
    const orderId = orderCode;
    const orderInfo = `Thanh toán đơn hàng ${orderCode}`;
    const redirectUrl = 'http://localhost:4200/checkout';
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
    return res.status(500).json({ message: 'Lỗi khi tạo đơn hàng: ' + (err.message || err) });
  }
};

/**
 * MoMo IPN handler - update status paid / failed
 */
const momoIpnHandler = async (req, res) => {
  try {
    // MoMo gửi ipn body; tuỳ config có thể là different names - bạn kiểm tra payload thực tế
    console.log('📥 Nhận IPN từ MoMo:', req.body);

    const { orderId, resultCode } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'Missing orderId in IPN' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (Number(resultCode) === 0) {
      order.status = 'paid';
      await order.save();

      // Clear giỏ hàng nếu có userId
      if (order.userId) {
        const cart = await Cart.findOne({ userId: order.userId });
        if (cart) {
          cart.items = [];
          cart.total = 0;
          await cart.save();
        }
      }
    } else {
      order.status = 'failed';
      await order.save();
      console.log(`⚠️ Thanh toán thất bại cho order ${orderId} (resultCode=${resultCode})`);
    }

    return res.status(200).json({ message: "IPN xử lý thành công" });
  } catch (err) {
    console.error("❌ Lỗi IPN MoMo:", err);
    return res.status(500).json({ message: "Lỗi IPN MoMo: " + (err.message || err) });
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

    return res.status(200).json(orders);
  } catch (error) {
    console.error('getAllOrders error:', error);
    return res.status(500).json({ message: 'Server error' });
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

    return res.status(200).json(orders);
  } catch (err) {
    console.error('getOrdersByUser error:', err);
    return res.status(500).json({ message: 'Lỗi server: ' + (err.message || err) });
  }
};

/**
 * 📌 Lấy đơn hàng theo mã orderId hoặc bởi _id nếu truyền ObjectId
 */
const getOrderById = async (req, res) => {
  try {
    const identifier = req.params.id;
    const order = await findByOrderIdentifier(identifier);

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    await order.populate({
      path: 'cartItems.productId',
      populate: { path: 'category', model: 'category' },
    }).execPopulate?.();

    return res.status(200).json(order);
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ message: 'Lỗi lấy đơn hàng: ' + (err.message || err) });
  }
};

/**
 * 📌 Cập nhật đơn hàng (admin)
 * - Sử dụng orderId (ORD-...) hoặc _id (ObjectId) trong params
 * - Chỉ cập nhật các field được phép
 */
const updateOrder = async (req, res) => {
  try {
    const identifier = req.params.id;
    const payload = sanitizeUpdatePayload(req.body);

    // Nếu có status, validate
    if (payload.status) {
      const s = String(payload.status).toLowerCase();
      if (!ALLOWED_STATUSES.has(s)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      payload.status = s;
    }

    // Tìm order theo identifier
    let order = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      order = await Order.findByIdAndUpdate(identifier, payload, { new: true });
    }
    if (!order) {
      order = await Order.findOneAndUpdate({ orderId: identifier }, payload, { new: true });
    }

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    return res.status(200).json(order);
  } catch (err) {
    console.error('updateOrder error:', err);
    return res.status(500).json({ message: 'Lỗi cập nhật đơn hàng: ' + (err.message || err) });
  }
};

/**
 * 📌 Xóa đơn hàng của user (chỉ cho chủ sở hữu)
 */
const deleteOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const identifier = req.params.id;

    let deletedOrder = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      deletedOrder = await Order.findOneAndDelete({ _id: identifier, userId });
    }
    if (!deletedOrder) {
      deletedOrder = await Order.findOneAndDelete({ orderId: identifier, userId });
    }

    if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });

    return res.status(200).json({ message: 'Đã xóa đơn hàng' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    return res.status(500).json({ message: 'Lỗi xóa đơn hàng: ' + (err.message || err) });
  }
};

/**
 * 📌 Hủy đơn hàng (của user)
 */
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const identifier = req.params.id;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      order = await Order.findOne({ _id: identifier, userId });
    }
    if (!order) {
      order = await Order.findOne({ orderId: identifier, userId });
    }

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });

    order.status = 'cancelled';
    await order.save();

    return res.status(200).json({ message: 'Đơn hàng đã được hủy', order });
  } catch (err) {
    console.error('cancelOrder error:', err);
    return res.status(500).json({ message: 'Lỗi huỷ đơn hàng: ' + (err.message || err) });
  }
};

/**
 * 📌 Hủy đơn hàng theo mã (cho admin)
 */
const cancelOrderByCode = async (req, res) => {
  try {
    const identifier = req.params.orderId;
    const order = await findByOrderIdentifier(identifier);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng với mã này' });

    order.status = 'cancelled';
    await order.save();

    return res.status(200).json({ message: 'Đơn hàng đã được hủy theo mã', order });
  } catch (err) {
    console.error('cancelOrderByCode error:', err);
    return res.status(500).json({ message: 'Lỗi: ' + (err.message || err) });
  }
};

/**
 * 📌 Toggle khóa/mở khóa đơn hàng (cho admin)
 */
const toggleOrderLock = async (req, res) => {
  try {
    const identifier = req.params.id;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      order = await Order.findById(identifier);
    }
    if (!order) {
      order = await Order.findOne({ orderId: identifier });
    }
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    order.isLocked = !order.isLocked;
    await order.save();

    return res
      .status(200)
      .json({ message: order.isLocked ? 'Đã khóa đơn hàng' : 'Đã mở khóa đơn hàng', order });
  } catch (err) {
    console.error('toggleOrderLock error:', err);
    return res.status(500).json({ message: 'Lỗi: ' + (err.message || err) });
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

    return res.json(revenue);
  } catch (err) {
    console.error('getRevenueByCategory error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 📌 Doanh thu theo ngày (hoặc khoảng thời gian)
 * Query: ?startDate=2025-09-01&endDate=2025-09-10
 */
const getRevenueByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const revenue = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalRevenue: {
            $sum: {
              $reduce: {
                input: '$cartItems',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $multiply: ['$$this.price', '$$this.quantity'] }
                  ]
                }
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.json(revenue);
  } catch (err) {
    console.error('getRevenueByDate error:', err);
    return res.status(500).json({ error: err.message });
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
  getRevenueByDate
};
