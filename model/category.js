const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 6, unique: true },
    image: String,
});
categorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model("category", categorySchema);
