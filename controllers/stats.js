const {productsell: productsell } = require('../model/model');
const Order = require('../model/order');                
exports.getStats = async (req, res) => {
  try {
    const orders = await order.find();
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalOrders = orders.length;

    const totalInventory = await productsell.countDocuments();

    // Giả lập tăng trưởng
    const revenueGrowth = 18; // %
    const orderGrowth = 12; // %
    const percentageSold = Math.min(
      (totalOrders / (totalOrders + totalInventory)) * 100,
      100
    ).toFixed(2);

    res.status(200).json({
      totalRevenue,
      revenueGrowth,
      totalInventory,
      orderGrowth,
      percentageSold: Number(percentageSold),
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy thống kê:', err);
    res.status(500).json({ message: 'Không thể lấy dữ liệu thống kê' });
  }
};
