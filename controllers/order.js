// controllers/order.js

import crypto from 'crypto';
import axios from 'axios';
import Order from '../model/order.js';
import { product as Product } from '../model/model.js';

// 📌 Tạo đơn hàng và trả link MoMo test (payWithMethod)
export const createOrderAndPayWithMoMo = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }
    if (!customerInfo?.fullName || !customerInfo?.phone) {
      return res.status(400).json({ message: 'Thiếu thông tin khách hàng (fullName, phone)' });
    }

    // Lấy chi tiết sản phẩm
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
    const redirectUrl = 'http://localhost:4200/home';
    const ipnUrl = 'http://localhost:3000/api/momo-ipn';
    const extraData = '';
    const partnerName = "Test Partner";
    const storeId = "MomoTestStore";
    const autoCapture = true;
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
      partnerName,
      storeId,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      autoCapture,
      signature,
      lang: 'vi'
    };

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
export const momoIpnHandler = async (req, res) => {
  try {
    console.log('📥 Nhận IPN từ MoMo:', req.body);
    res.status(200).json({ message: 'IPN nhận thành công' });
  } catch (err) {
    console.error('❌ Lỗi IPN MoMo:', err);
    res.status(500).json({ message: 'Lỗi IPN MoMo: ' + err.message });
  }
};

// 📌 Lấy tất cả đơn hàng
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'cartItems.productId',
        select: 'name price category image',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .lean(); // trả dữ liệu dạng object thường

    // Đảm bảo trả về đầy đủ thông tin khách hàng
    const formattedOrders = orders.map(order => ({
      ...order,
      customerInfo: {
        fullName: order.customerInfo?.fullName || '',
        phone: order.customerInfo?.phone || '',
        email: order.customerInfo?.email || '',
        address: order.customerInfo?.address || ''
      }
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📌 Lấy đơn hàng theo ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate({
        path: 'cartItems.productId',
        populate: { path: 'category', model: 'category' }
      });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    res.status(200).json(order);
  } catch (err) {
    console.error('❌ Lỗi lấy đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi lấy đơn hàng: ' + err.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('❌ Lỗi cập nhật đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi cập nhật đơn hàng: ' + err.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id });

    if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    res.status(200).json({ message: 'Đã xóa đơn hàng' });
  } catch (err) {
    console.error('❌ Lỗi xóa đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi xóa đơn hàng: ' + err.message });
  }
};

export const toggleOrderLock = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    order.isLocked = !order.isLocked;
    await order.save();

    res.status(200).json({ message: order.isLocked ? 'Đã khóa đơn hàng' : 'Đã mở khóa đơn hàng' });
  } catch (err) {
    console.error('❌ Lỗi khóa/mở khóa đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

export const getRevenueByCategory = async (req, res) => {
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
