const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const themeSchema = new mongoose.Schema({
  name: { type: String, default: "no name", trim: true, minlength: 1 },
  desc: String,
  linkimage: String,
  linkproduct: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "author" },
});
themeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("theme", themeSchema);
