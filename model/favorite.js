// model/favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  name: String,
  image: String,
  price: Number
}, { timestamps: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
