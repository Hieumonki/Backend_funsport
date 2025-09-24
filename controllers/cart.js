const Cart = require("../model/cart");
const { product: Product, productsell: ProductSell } = require("../model/model");

// ➕ Thêm sản phẩm vào giỏ
// paste nguyên hàm vào file controller của bạn, thay thế phiên bản cũ
const addToCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc chưa đăng nhập" });
    }
    const userId = req.user.id;
    const { productId, size, color, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Thiếu productId" });
    }
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return res.status(400).json({ message: "Số lượng không hợp lệ" });

    // lấy cart hoặc tạo mới
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [], total: 0 });

    // Lấy product: tìm trong product trước, nếu không có -> productsell
    let productData = await Product.findById(productId).lean();
    let isSell = false;
    if (!productData) {
      productData = await ProductSell.findById(productId).lean();
      if (productData) isSell = true;
    }

    if (!productData) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // xác định có variants không
    const hasVariants = Array.isArray(productData.variants) && productData.variants.length > 0;

    let chosenColor = color || null;
    let chosenSize = size || null;
    let price = null;

    if (hasVariants) {
      // nếu có variants thì cần color (và size nếu product có size)
      if (!color) {
        return res.status(400).json({ message: "Vui lòng chọn màu" });
      }

      // tìm variant: nếu variant có size -> so size+color, nếu không có size -> so color
      const variant = productData.variants.find((v) => {
        if (v.size !== undefined && v.size !== null && String(v.size).trim() !== "") {
          return String(v.size) === String(size) && String(v.color) === String(color);
        }
        return String(v.color) === String(color);
      });

      if (!variant) {
        return res.status(400).json({ message: "Biến thể không tồn tại" });
      }

      if (variant.price === undefined || variant.price === null) {
        return res.status(400).json({ message: "Biến thể chưa có giá bán" });
      }

      price = Number(variant.price);
      chosenColor = variant.color || chosenColor;
      chosenSize = variant.size || chosenSize;
    } else {
      // không có variants: lấy price từ document (productsell có thể lưu price ở root)
      price = Number(productData.price ?? productData.priceold ?? 0);
      // nếu không có price rõ ràng, báo lỗi
      if (!price || price <= 0) {
        return res.status(400).json({ message: "Sản phẩm chưa có giá bán" });
      }
      // giữ color/size nếu FE gửi (không bắt buộc)
      chosenColor = color || null;
      chosenSize = size || null;
    }

    // tìm item đã tồn tại (chú ý item.productId có thể là ObjectId hoặc object populated)
    const existing = cart.items.find((item) => {
      // lấy id string an toàn
      const itemPid = item.productId && item.productId._id ? item.productId._id.toString() : (item.productId && item.productId.toString ? item.productId.toString() : null);
      const itemColor = item.color || null;
      const itemSize = item.size || null;
      return itemPid === productId && itemColor === (chosenColor || null) && itemSize === (chosenSize || null);
    });

    if (existing) {
      existing.quantity += qty;
      existing.price = price;
      if (existing.quantity <= 0) cart.items = cart.items.filter((i) => i !== existing);
    } else {
      cart.items.push({
        productId,
        size: chosenSize,
        color: chosenColor,
        quantity: qty,
        price,
      });
    }

    cart.total = calculateCartTotal(cart.items);
    await cart.save();

    // cố gắng populate để FE nhận được thông tin product, nếu populate lỗi => trả cart thô
    let populated = null;
    try {
      populated = await Cart.findById(cart._id).populate("items.productId");
    } catch (popErr) {
      console.error("Populate failed (non-fatal):", popErr.stack || popErr);
    }

    res.status(201).json(populated || cart);
  } catch (err) {
    // in full stack cho bạn xem ở server logs (Render)
    console.error("❌ addToCart error:", err.stack || err);
    res.status(500).json({ message: "Lỗi server khi thêm giỏ hàng", error: err.message });
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
          (item.color || null) === (color || null) &&
          (item.size || null) === (size || null)
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
        (item.color || null) === (color || null) &&
        (item.size || null) === (size || null)
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
