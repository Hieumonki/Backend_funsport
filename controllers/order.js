const { order: Order } = require('../model/model');

// 📌 Tạo đơn hàng (Lưu vào MongoDB trước khi gọi MoMo)
const createOrder = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;

    // Validate giỏ hàng
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    // Validate thông tin khách hàng
    if (!customerInfo?.name || !customerInfo?.phone) {
      return res.status(400).json({ message: 'Thiếu thông tin khách hàng (tên, số điện thoại)' });
    }

    // Tạo mã đơn hàng riêng (dùng cho MoMo hoặc quản lý)
    const orderCode = 'ORD-' + Date.now();

    const newOrder = await Order.create({
      orderId: orderCode, // mã đơn hàng riêng
      cartItems,
      customerInfo,
      amount,
      payment: payment || 'momo',
      status: 'pending',
      createdAt: new Date()
    });

    res.status(201).json(newOrder);

  } catch (err) {
    console.error('❌ Lỗi khi tạo đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng: ' + err.message });
  }
};

// 📌 Lấy tất cả đơn hàng
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'cartItems.productId',
        select: 'name price category',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error('❌ Lỗi khi lấy đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// 📌 Lấy đơn hàng theo orderId (mã đơn hàng riêng)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate({
        path: 'cartItems.productId',
        select: 'name price category',
        populate: { path: 'category', select: 'name' }
      });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error('❌ Lỗi khi lấy đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Cập nhật đơn hàng (vd: sau khi thanh toán thành công)
const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      req.body,
      { new: true }
    ).populate({
      path: 'cartItems.productId',
      select: 'name price category',
      populate: { path: 'category', select: 'name' }
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng để cập nhật' });
    }

    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('❌ Lỗi khi cập nhật đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Xoá đơn hàng
const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id });

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xoá' });
    }

    res.status(200).json({ message: 'Xoá đơn hàng thành công' });
  } catch (err) {
    console.error('❌ Lỗi khi xoá đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Thống kê doanh thu theo category
const getRevenueByCategory = async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      { $unwind: "$cartItems" },
      {
        $lookup: {
          from: 'products',
          localField: 'cartItems.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalRevenue: { $sum: { $multiply: ['$cartItems.price', '$cartItems.quantity'] } },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.status(200).json(revenue);
  } catch (err) {
    console.error('❌ Lỗi khi thống kê doanh thu:', err);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getRevenueByCategory
};
