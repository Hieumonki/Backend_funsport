const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  selectedSize: { type: String, required: true },
  selectedColor: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartItemSchema);
