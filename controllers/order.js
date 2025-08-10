const { order: Order } = require('../model/model');

// 📌 Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'productId',
        select: 'name price category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('userId', 'name email fullName image');

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// 📌 Lấy đơn hàng theo ID (orderId)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate({
        path: 'productId',
        select: 'name price category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
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
    )
      .populate({
        path: 'productId',
        select: 'name price category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('userId', 'name email fullName image');

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng để cập nhật' });
    }

    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi: ' + err.message });
  }
};
