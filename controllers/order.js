const Bestseller = require("../model/model");

exports.getAllBestSellers = async (req, res) => {
  try {
    const bestsellers = await Bestseller.find()
      .populate("productId") // lấy đầy đủ thông tin sản phẩm
      .sort({ createdAt: -1 });

    res.status(200).json(bestsellers);
  } catch (error) {
    console.error("❌ Lỗi khi truy vấn bestseller:", error.message);
    res.status(500).json({ error: "Không thể tải bestseller" });
  }
};

// thêm bestseller (ví dụ khi có đơn hàng)
exports.addOrUpdateBestseller = async (productId, quantity) => {
  try {
    let record = await Bestseller.findOne({ productId });
    if (record) {
      record.count += quantity;
      await record.save();
    } else {
      await Bestseller.create({ productId, count: quantity });
    }
  } catch (error) {
    console.error("❌ Lỗi cập nhật bestseller:", error.message);
  }
};
