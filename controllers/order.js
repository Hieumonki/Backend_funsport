const { order: Order, product: Product } = require('../model/model');

// 🚀 MoMo Payment + tạo đơn hàng
const createOrderAndPayWithMoMo = async (req, res) => {
  try {
    const { cartItems, customerInfo, amount, payment } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    if (!customerInfo?.fullName || !customerInfo?.phone) {
      return res.status(400).json({ message: 'Thiếu thông tin khách hàng (fullName, phone)' });
    }

    // ✅ Lấy dữ liệu sản phẩm từ DB để bổ sung name & price
    const detailedCartItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
        }
        return {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity || 1
        };
      })
    );

    const orderCode = 'ORD-' + Date.now();

    const newOrder = await Order.create({
      orderId: orderCode,
      cartItems: detailedCartItems,
      customerInfo,
      amount,
      payment: payment || 'momo',
      status: 'pending',
      createdAt: new Date()
    });

    // TODO: Gọi API MoMo thật (hiện tại trả về mẫu)
    res.status(201).json({
      message: 'Tạo đơn hàng thành công, chưa thực hiện thanh toán MoMo',
      order: newOrder
    });
  } catch (err) {
    console.error('❌ Lỗi khi tạo đơn hàng MoMo:', err);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng: ' + err.message });
  }
};

// 📌 MoMo IPN handler
const momoIpnHandler = async (req, res) => {
  try {
    console.log('📥 Nhận IPN từ MoMo:', req.body);
    // TODO: Cập nhật trạng thái đơn hàng
    res.status(200).json({ message: 'IPN nhận thành công' });
  } catch (err) {
    console.error('❌ Lỗi IPN MoMo:', err);
    res.status(500).json({ message: 'Lỗi IPN MoMo: ' + err.message });
  }
};

// 📌 Lấy tất cả đơn hàng
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'cartItems.productId',
        populate: { path: 'category', model: 'categories' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error('❌ Lỗi lấy danh sách đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi lấy đơn hàng: ' + err.message });
  }
};

// 📌 Lấy đơn hàng theo ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate({
        path: 'cartItems.productId',
        populate: { path: 'category', model: 'categories' }
      });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    res.status(200).json(order);
  } catch (err) {
    console.error('❌ Lỗi lấy đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi lấy đơn hàng: ' + err.message });
  }
};

// 📌 Cập nhật đơn hàng
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
    console.error('❌ Lỗi cập nhật đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi cập nhật đơn hàng: ' + err.message });
  }
};

// 📌 Xóa đơn hàng
const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id });

    if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    res.status(200).json({ message: 'Đã xóa đơn hàng' });
  } catch (err) {
    console.error('❌ Lỗi xóa đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi xóa đơn hàng: ' + err.message });
  }
};

// 📌 Khóa/Mở khóa đơn hàng
const toggleOrderLock = async (req, res) => {
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

// 📌 Thống kê doanh thu theo danh mục
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
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo.name',
          totalRevenue: { $sum: { $multiply: ['$cartItems.quantity', '$cartItems.price'] } }
        }
      }
    ]);

    res.status(200).json(revenue);
  } catch (err) {
    console.error('❌ Lỗi thống kê doanh thu:', err);
    res.status(500).json({ message: 'Lỗi thống kê doanh thu: ' + err.message });
  }
};

module.exports = {
  createOrderAndPayWithMoMo,
  momoIpnHandler,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  toggleOrderLock,
  getRevenueByCategory
};
