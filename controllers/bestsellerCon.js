const { bestseller } = require('../model/model'); // tên đúng là bestseller (viết thường)

exports.getAllBestSellers = async (req, res) => {
  try {
    const bestsellers = await bestseller.find().sort({ createdAt: -1 });
    res.status(200).json(bestsellers);
  } catch (error) {
    console.error('❌ Lỗi khi truy vấn bestseller:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
