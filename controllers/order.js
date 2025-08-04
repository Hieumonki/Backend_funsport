const { order: Order } = require('../model/model');

// Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('productId', 'name price')
      .populate('userId', 'name email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// Lấy đơn hàng theo ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate('productId', 'name price')
      .populate('userId', 'name email');
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};

// Cập nhật trạng thái đơn hàng
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { $set: req.body },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật: ' + err.message });
  }
};

// Xóa đơn hàng
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findOneAndDelete({ orderId: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json({ message: 'Xóa đơn hàng thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// Toggle trạng thái "locked"
exports.toggleOrderLock = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    order.status = order.status === 'locked' ? 'inprogress' : 'locked';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Không thể thay đổi trạng thái: ' + err.message });
  }
};

// Doanh thu theo category
exports.getRevenueByCategory = async (req, res) => {
  try {
    const result = await Order.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'productData'
        }
      },
      { $unwind: '$productData' },
      {
        $group: {
          _id: '$productData.category', // nhóm theo category
          totalRevenue: { $sum: '$total' }, // tính tổng doanh thu
          count: { $sum: 1 } // số đơn hàng
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Không thể lấy dữ liệu doanh thu: ' + err.message });
  }
};
