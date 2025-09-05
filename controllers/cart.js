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

// Thêm sản phẩm vào giỏconst Cart = require("../models/cart.model");

// Thêm vào giỏ
exports.addToCart = async (req, res) => {
  try {
    const { productId, selectedSize, selectedColor, quantity, userId } = req.body;

    // Kiểm tra đã tồn tại chưa
    let cartItem = await Cart.findOne({ product: productId, selectedSize, selectedColor, userId });

    if (cartItem) {
      cartItem.quantity += quantity || 1;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        product: productId,
        selectedSize,
        selectedColor,
        quantity: quantity || 1,
        userId
      });
    }

    res.status(200).json(cartItem);
  } catch (err) {
    console.error("❌ Lỗi addToCart:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy giỏ hàng theo user
exports.getCart = async (req, res) => {
  try {
    const userId = req.params.userId;
    const cartItems = await Cart.find({ userId }).populate("product");
    res.status(200).json(cartItems);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa 1 item
exports.removeItem = async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

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
