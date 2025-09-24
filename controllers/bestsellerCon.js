const { bestseller } = require('../model/model'); // model gốc, giữ nguyên DB

// Lấy tất cả bestseller
exports.getAllBestSellers = async (req, res) => {
  try {
    const bestsellers = await bestseller.find().sort({ createdAt: -1 });
    res.status(200).json(bestsellers);
  } catch (error) {
    console.error('❌ Lỗi khi truy vấn bestseller:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy chi tiết 1 bestseller
exports.getBestSellerById = async (req, res) => {
  try {
    const item = await bestseller.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error('❌ Lỗi khi lấy chi tiết bestseller:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Thêm bestseller mới
exports.createBestSeller = async (req, res) => {
  try {
    const newItem = new bestseller(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('❌ Lỗi khi thêm bestseller:', error.message);
    res.status(400).json({ message: 'Thêm thất bại', error: error.message });
  }
};
