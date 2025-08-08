const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  desc: String,
  category: String,
  image: String,
  price: Number,
  tab: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "author" },
});
productSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("product", productSchema);
