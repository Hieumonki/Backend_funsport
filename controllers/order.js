const { order: Order } = require('../model/model');

// 📌 Lấy tất cả đơn hàng
const getAllOrders = async (req, res) => {
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
const getOrderById = async (req, res) => {
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
const updateOrder = async (req, res) => {
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

// 📌 Xoá đơn hàng
const deleteOrder = async (req, res) => {
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
const toggleOrderLock = async (req, res) => {
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

// 📌 Thống kê doanh thu theo category (kèm tên category)
const getRevenueByCategory = async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
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
          totalRevenue: { $sum: '$totalAmount' },
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

// 📌 Export tất cả hàm
module.exports = {
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  toggleOrderLock,
  getRevenueByCategory
};
