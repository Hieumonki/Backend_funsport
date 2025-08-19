const Favorite = require("../model/favorite");

// ✅ Thêm sản phẩm yêu thích
const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { productId } = req.body;

    const exists = await Favorite.findOne({ userId, productId });
    if (exists) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích" });
    }

    const favorite = new Favorite({ userId, productId });
    await favorite.save();

    await favorite.populate("productId"); // lấy thông tin đầy đủ của product
    res.status(201).json(favorite);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Lấy danh sách yêu thích
const getFavoritesByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId }).populate("productId");
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Xoá theo _id
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Favorite.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy favorite" });
    }

    res.json({ message: "Đã xoá khỏi yêu thích" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { addFavorite, getFavoritesByUser, removeFavorite };
