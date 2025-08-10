const { order: Order } = require('../model/model');

// 📌 Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('productId', 'name price category') // Lấy name, price, category từ Product
      .populate('userId', 'name email fullName image'); // Lấy thông tin User từ Account

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// 📌 Lấy đơn hàng theo ID (orderId)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate('productId', 'name price category')
      .populate('userId', 'name email fullName image');

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Cập nhật đơn hàng
exports.updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      req.body,
      { new: true }
    ).populate('productId', 'name price category')
     .populate('userId', 'name email fullName image');

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng để cập nhật' });
    }

    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Xoá đơn hàng
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id });

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xoá' });
    }

    res.status(200).json({ message: 'Xoá đơn hàng thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Khoá / mở khoá đơn hàng
exports.toggleOrderLock = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    order.locked = !order.locked;
    await order.save();

    res.status(200).json({ message: `Đơn hàng đã được ${order.locked ? 'khoá' : 'mở khoá'}` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// 📌 Thống kê doanh thu theo category
exports.getRevenueByCategory = async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      {
        $lookup: {
          from: 'products', // Tên collection trong MongoDB
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalRevenue: { $sum: '$totalAmount' }, // totalAmount phải có trong Order model
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.status(200).json(revenue);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};
