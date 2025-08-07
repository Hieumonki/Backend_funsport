const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const statsSchema = new mongoose.Schema({
  totalRevenue: { type: String, default: "0 VNĐ" },
  inventory: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  change: { type: String, default: "0% so với trước" },
  status: { type: String, default: "success" },
  updatedAt: { type: Date, default: Date.now },
});
statsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("stats", statsSchema);
