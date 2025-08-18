// controllers/favoriteCon.js
import Favorite from "../model/favorite.js";
import Product from "../model/model.js";

// ✅ Lấy danh sách sản phẩm yêu thích của user
export const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id })
      .populate("productId");
    res.json(favorites.map(f => f.productId)); // chỉ trả về product
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Thêm sản phẩm vào yêu thích
export const addFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const exists = await Favorite.findOne({ userId: req.user.id, productId });
    if (exists) return res.status(400).json({ message: "Đã tồn tại trong yêu thích" });

    const favorite = new Favorite({ userId: req.user.id, productId });
    await favorite.save();

    res.json(favorite);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Xoá sản phẩm khỏi yêu thích
export const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params; // id = productId
    await Favorite.findOneAndDelete({ userId: req.user.id, productId: id });
    res.json({ message: "Xoá thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
