const Favorite = require("../model/favorite");

// ✅ Thêm sản phẩm yêu thích
const addFavorite = async (req, res) => {
  try {
    // 🔹 Kiểm tra req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId không được để trống" });
    }

    // 🔹 Kiểm tra sản phẩm đã tồn tại
    const exists = await Favorite.findOne({ userId, productId });
    if (exists) {
      // trả về 200 kèm favorite hiện có để frontend không bị lỗi
      const populated = await Favorite.findById(exists._id).populate("productId");
      return res.status(200).json(populated);
    }

    // 🔹 Tạo mới favorite
    const favorite = new Favorite({ userId, productId });
    await favorite.save();

    // 🔹 Populate productId an toàn
    const populatedFavorite = await Favorite.findById(favorite._id).populate("productId");

    res.status(201).json(populatedFavorite);
  } catch (err) {
    console.error("❌ Lỗi addFavorite:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Lấy danh sách favorites của user
const getFavoritesByUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const favorites = await Favorite.find({ userId }).populate("productId");

    res.json(favorites);
  } catch (err) {
    console.error("❌ Lỗi getFavoritesByUser:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Xoá favorite theo _id
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Favorite.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy favorite" });
    }

    res.json({ message: "Đã xoá khỏi yêu thích" });
  } catch (err) {
    console.error("❌ Lỗi removeFavorite:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { addFavorite, getFavoritesByUser, removeFavorite };
