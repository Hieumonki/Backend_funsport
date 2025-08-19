const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: String,
  image: String,
  price: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Favorite", favoriteSchema);
