const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true, minlength: 6 },
  description: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});
newsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("news", newsSchema);
