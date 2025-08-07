const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 6, unique: true },
  image: { type: String, default: "no name" },
  fullName: { type: String, minlength: 6, unique: true },
  email: { type: String, required: true, minlength: 6, unique: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: "" },
  admin: { type: Boolean, default: false },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "product" }],
  status: { type: String, enum: ["active", "locked", "pending"], default: "pending" },
  spamCount: { type: Number, default: 0 },
  cancellationCount: { type: Number, default: 0 },
  ghostingCount: { type: Number, default: 0 },
}, { timestamps: true });
accountSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("account", accountSchema);
