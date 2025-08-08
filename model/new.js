const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.news || mongoose.model("news", newsSchema);
