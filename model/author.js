const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const authorSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  image: String,
  desc: String,
  link: String,
  background: String,
  createUser: String,
  theme: [{ type: mongoose.Schema.Types.ObjectId, ref: "theme" }],
});
authorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("author", authorSchema);
