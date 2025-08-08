const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const orderSchema = new mongoose.Schema({
  orderId: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "account" },
  totalAmount: Number,
  payment: String,
  status: String,
  category: String,
  createdAt: { type: Date, default: Date.now },
});
orderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("order", orderSchema);
