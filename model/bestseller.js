const mongoose = require("mongoose");

const bestSellerSchema = new mongoose.Schema({
  name: String,
  image: String,
  price: Number,
  priceold: Number,
  category: String,
  tab: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("bestseller", bestSellerSchema);
