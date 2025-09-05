const Cart = require("../model/cart");

// Lấy giỏ hàng
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    res.json(cart || { items: [], total: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
  try {
    const { productId, name, price, image, size, color, quantity } = req.body;

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [], total: 0 });
    }

    // Kiểm tra nếu sản phẩm đã có
    const existing = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ productId, name, price, image, size, color, quantity });
    }

    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa sản phẩm khỏi giỏ
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, size, color } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) =>
        !(item.productId.toString() === productId && item.size === size && item.color === color)
    );

    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
