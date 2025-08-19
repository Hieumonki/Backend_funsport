// controllers/favoriteCon.js
const Favorite = require('../model/favorite.js');

// 📌 Lấy danh sách favorite của user từ token
const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// 📌 Thêm sản phẩm yêu thích (lưu cả productId để check chính xác)
const addFavorite = async (req, res) => {
  try {
    const { productId, name, image, price } = req.body;

    if (!productId || !name || !image || !price) {
      return res.status(400).json({ message: 'Thiếu thông tin sản phẩm' });
    }

    // Check trùng theo userId + productId
    const exists = await Favorite.findOne({ userId: req.user.id, productId });
    if (exists) {
      return res.status(400).json({ message: 'Sản phẩm đã có trong yêu thích' });
    }

    const favorite = new Favorite({
      userId: req.user.id,
      productId,   // ✅ Lưu thêm productId
      name,
      image,
      price
    });

    await favorite.save();
    res.json(favorite);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// 📌 Xoá sản phẩm khỏi favorite theo _id (hoặc theo productId nếu cần)
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params; // id = _id của favorite hoặc productId
    const deleted = await Favorite.findOneAndDelete({
      userId: req.user.id,
      $or: [{ _id: id }, { productId: id }]
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong yêu thích' });
    }

    res.json({ message: 'Xoá thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
