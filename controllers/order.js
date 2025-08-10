const { order: Order } = require('../model/model');

// Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('productId', 'name price category') // lấy name, price, category của sản phẩm
      .populate('userId', 'name email fullName image'); // lấy thông tin user

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// Lấy đơn hàng theo ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate('productId', 'name price category')
      .populate('userId', 'name email fullName image');

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};
