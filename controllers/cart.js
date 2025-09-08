const Cart = require("../model/cart");
const { product: Product } = require("../model/model");

// ➕ Thêm sản phẩm vào giỏ
const addToCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const { productId, size, color, quantity } = req.body;

    if (!productId || !size || !color) {
      return res.status(400).json({ message: "Thiếu productId / size / color" });
    }

    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return res.status(400).json({ message: "Số lượng không hợp lệ" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
    }

    // Lấy sản phẩm & variant
    const productData = await Product.findById(productId);
    if (!productData) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    const variant = productData.variants.find(
      (v) => v.size === size && v.color === color
    );
    if (!variant) {
      return res.status(400).json({ message: "Biến thể không tồn tại" });
    }

    // Kiểm tra item tồn tại
    const existing = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existing) {
      existing.quantity += qty;
      existing.price = Number(variant.price) || 0; // ✅ đảm bảo luôn có giá
      if (existing.quantity <= 0) {
        cart.items = cart.items.filter((i) => i !== existing);
      }
    } else {
      cart.items.push({
        productId,
        size,
        color,
        quantity: qty,
        price: Number(variant.price) || 0, // ✅ fallback giá = 0 nếu thiếu
      });
    }


    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Lỗi addToCart:", err);
    res.status(500).json({ message: "Lỗi server khi thêm giỏ hàng", error: err.message });
  }
};

// 📦 Lấy giỏ hàng
const getCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.json({ items: [], total: 0 });

    res.json(cart);
  } catch (err) {
    console.error("❌ Lỗi getCart:", err);
    res.status(500).json({ message: "Lỗi server khi lấy giỏ hàng", error: err.message });
  }
};

// ❌ Xoá sản phẩm
const removeFromCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
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
          item.size === size &&
          item.color === color
        )
    );

    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.json(populated || { items: [], total: 0 });
  } catch (err) {
    console.error("❌ Lỗi removeFromCart:", err);
    res.status(500).json({ message: "Lỗi server khi xoá sản phẩm", error: err.message });
  }
};

// ✅ Hàm tính tổng an toàn
const calculateCartTotal = (items) => {
  return items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);
};


module.exports = { addToCart, getCart, removeFromCart };
