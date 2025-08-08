const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSellSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  image: String,
  price: Number,
  priceold: Number,
  category: String,
  createdAt: { type: Date, default: Date.now },
});
productSellSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("productsell", productSellSchema);
