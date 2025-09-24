const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  size: { type: String },
  color: { type: String },
  quantity: { type: Number, default: 1, min: 1 },
  price: { type: Number, default: 0 } // ❌ bỏ required, ✅ fallback = 0
});

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    items: [cartItemSchema],
    total: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("cart", cartSchema);
