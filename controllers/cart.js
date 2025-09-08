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

    if (!productId) {
      return res.status(400).json({ message: "productId không được để trống" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
    }

    // 🔍 Lấy sản phẩm và variant
    const productData = await Product.findById(productId);
    if (!productData) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const variant = productData.variants.find(
      v => v.size === size && v.color === color
    );
    if (!variant) {
      return res.status(400).json({ message: "Biến thể không tồn tại" });
    }

    // ✅ Kiểm tra xem sản phẩm đã có trong giỏ chưa
    const existing = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existing) {
      existing.quantity += quantity || 1;
    } else {
      cart.items.push({
        productId,
        size,
        color,
        quantity: quantity || 1,
        price: variant.price, // ✅ Lưu giá tại thời điểm thêm vào giỏ
      });
    }

    // ✅ Tính tổng dựa trên price đã lưu trong cart
    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Lỗi addToCart:", err);
    res.status(500).json({ message: "Lỗi server khi thêm giỏ hàng", error: err.message });
  }
};

// 📦 Lấy giỏ hàng của user
const getCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    res.json(cart || { items: [], total: 0 });
  } catch (err) {
    console.error("❌ Lỗi getCart:", err);
    res.status(500).json({ message: "Lỗi server khi lấy giỏ hàng", error: err.message });
  }
};

// ❌ Xoá đúng 1 sản phẩm (theo productId + size + color)
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

    // ✅ Chỉ xoá đúng variant
    cart.items = cart.items.filter(item =>
      !(
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
      )
    );

    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.json(populated);
  } catch (err) {
    console.error("❌ Lỗi removeFromCart:", err);
    res.status(500).json({ message: "Lỗi server khi xoá sản phẩm", error: err.message });
  }
};

// 🧮 Hàm tính tổng dựa vào price đã lưu trong cart
const calculateCartTotal = (items) => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

module.exports = { addToCart, getCart, removeFromCart };
