const Cart = require("../model/cart");
const { product: Product } = require("../model/model");

// ➕ Thêm sản phẩm vào giỏ
const addToCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const { productId, size, color, quantity } = req.body;

    if (!productId || !color) {
      return res
        .status(400)
        .json({ message: "Thiếu productId / color (size có thể bỏ trống)" });
    }

    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return res.status(400).json({ message: "Số lượng không hợp lệ" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
    }

    // 🔍 Lấy sản phẩm & variant
    const productData = await Product.findById(productId);
    if (!productData) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // ✅ Tìm variant theo color (và size nếu có)
    const variant = productData.variants.find((v) => {
      if (v.size) {
        return v.size === size && v.color === color;
      }
      return v.color === color;
    });

    if (!variant) {
      return res.status(400).json({ message: "Biến thể không tồn tại" });
    }

    if (variant.price === undefined || variant.price === null) {
      return res.status(400).json({ message: "Biến thể chưa có giá bán" });
    }

    // 🔄 Kiểm tra item tồn tại
    const existing = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.color === color &&
        (item.size || "") === (size || "")
    );

    if (existing) {
      existing.quantity += qty;
      existing.price = Number(variant.price);
      if (existing.quantity <= 0) {
        cart.items = cart.items.filter((i) => i !== existing);
      }
    } else {
      cart.items.push({
        productId,
        size: size || null,
        color,
        quantity: qty,
        price: Number(variant.price),
      });
    }

    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    console.log("🛒 Cart sau khi thêm:", JSON.stringify(cart.items, null, 2));

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Lỗi addToCart:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi thêm giỏ hàng", error: err.message });
  }
};

// 📦 Lấy giỏ hàng
const getCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.json({ items: [], total: 0 });

    res.json(cart);
  } catch (err) {
    console.error("❌ Lỗi getCart:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy giỏ hàng", error: err.message });
  }
};

// ❌ Xoá sản phẩm
const removeFromCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const { productId, size, color } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          item.color === color &&
          (item.size || "") === (size || "")
        )
    );

    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.json(populated || { items: [], total: 0 });
  } catch (err) {
    console.error("❌ Lỗi removeFromCart:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi xoá sản phẩm", error: err.message });
  }
};

// ➖ Giảm số lượng
const decreaseFromCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const { productId, size, color } = req.body;

    let cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId._id.toString() === productId &&
        item.color === color &&
        (item.size || "") === (size || "")
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm trong giỏ" });
    }

    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.json(populated || { items: [], total: 0 });
  } catch (err) {
    console.error("❌ Lỗi decreaseFromCart:", err);
    res.status(500).json({
      message: "Lỗi server khi giảm số lượng",
      error: err.message,
    });
  }
};

// 🗑 Xoá toàn bộ giỏ hàng
const clearCart = async (req, res) => {
  try {
    console.log("📥 clearCart API được gọi bởi user:", req.user?.id);

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    cart.items = [];
    cart.total = 0;
    await cart.save();

    console.log("🛒 Giỏ hàng sau khi clear:", cart);

    res.json({ message: "Đã xoá toàn bộ giỏ hàng thành công", cart });
  } catch (err) {
    console.error("❌ Lỗi clearCart:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi xoá giỏ hàng", error: err.message });
  }
};

// ✅ Hàm tính tổng
const calculateCartTotal = (items) => {
  return items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  decreaseFromCart,
  clearCart,
};
