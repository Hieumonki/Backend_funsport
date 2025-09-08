const Cart = require("../model/cart");
const { product: Product } = require("../model/model"); // lấy đúng model Product

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

    if (!productId) {
      return res.status(400).json({ message: "productId không được để trống" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
    }

    const existing = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existing) {
      existing.quantity += quantity || 1;
    } else {
      cart.items.push({ productId, size, color, quantity: quantity || 1 });
    }

    cart.total = await calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Lỗi addToCart:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi thêm giỏ hàng", error: err.message });
  }
};

// 📦 Lấy giỏ hàng của user
const getCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    res.json(cart || { items: [], total: 0 });
  } catch (err) {
    console.error("❌ Lỗi getCart:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy giỏ hàng", error: err.message });
  }
};


// ❌ Xoá đúng 1 sản phẩm (theo productId + size + color)
const removeFromCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }

    const userId = req.user.id;
    const { productId, size, color } = req.body;  // ✅ cần cả 3

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    // ✅ Chỉ xoá đúng 1 biến thể theo productId + size + color
    cart.items = cart.items.filter(item =>
      !(
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
      )
    );

    cart.total = await calculateCartTotal(cart.items);
    await cart.save();

    const populated = await Cart.findById(cart._id).populate("items.productId");
    res.json(populated);
  } catch (err) {
    console.error("❌ Lỗi removeFromCart:", err);
    res.status(500).json({ message: "Lỗi server khi xoá sản phẩm", error: err.message });
  }
};


const calculateCartTotal = async (items) => {
  let total = 0;
  for (const item of items) {
    const productData = await Product.findById(item.productId);
    if (productData) {
      const variant = productData.variants.find(
        v => v.size === item.size && v.color === item.color
      );
      if (variant) {
        total += variant.price * item.quantity;
      }
    }
  }
  return total;
};


module.exports = { addToCart, getCart, removeFromCart };
