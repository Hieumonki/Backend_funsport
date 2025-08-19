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

// 📌 Thêm sản phẩm yêu thích (lưu trực tiếp name, image, price)
const addFavorite = async (req, res) => {
  try {
    const { name, image, price } = req.body;

    if (!name || !image || !price) {
      return res.status(400).json({ message: 'Thiếu thông tin sản phẩm' });
    }

    // Check trùng
    const exists = await Favorite.findOne({ userId: req.user.id, name });
    if (exists) {
      return res.status(400).json({ message: 'Sản phẩm đã có trong yêu thích' });
    }

    const favorite = new Favorite({
      userId: req.user.id,
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

// 📌 Xoá sản phẩm khỏi favorite theo _id
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params; // id = _id của favorite
    const deleted = await Favorite.findOneAndDelete({ userId: req.user.id, _id: id });

    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong yêu thích' });
    }

    res.json({ message: 'Xoá thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
