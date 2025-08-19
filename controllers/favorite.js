const Favorite = require("../model/favorite");

// Thêm sản phẩm yêu thích
const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id; // lấy từ token
    const { productId, name, image, price } = req.body;

    const exists = await Favorite.findOne({ userId, productId });
    if (exists) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích" });
    }

    const favorite = new Favorite({ userId, productId, name, image, price });
    await favorite.save();
    res.status(201).json(favorite);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err });
  }
};

// Lấy danh sách yêu thích
const getFavoritesByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err });
  }
};

// Xoá sản phẩm yêu thích
const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    await Favorite.deleteOne({ userId, productId });
    res.json({ message: "Đã xoá khỏi yêu thích" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err });
  }
};

module.exports = { addFavorite, getFavoritesByUser, removeFavorite };
