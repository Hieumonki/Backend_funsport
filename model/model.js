const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

// ===== Category =====
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 6,
    unique: true,
  },
  image: String,
});
categorySchema.plugin(mongoosePaginate);

// ===== Product =====
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  desc: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
  image: String,
  price: Number,
  tab: String,

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "author",
  },
});
productSchema.plugin(mongoosePaginate);

// ===== ProductSell =====
const productSellSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image: String,
  price: Number,
  priceold: Number,
  category: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
productSellSchema.plugin(mongoosePaginate);

// Model

// ===== Author =====
const authorSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  image: String,
  desc: String,
  link: String,
  background: String,
  createUser: String,
  theme: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "theme",
    },
  ],
});
authorSchema.plugin(mongoosePaginate);

// ===== Theme =====
const themeSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'no name',
    trim: true,
    minlength: 1,
  },
  desc: String,
  linkimage: String,
  linkproduct: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "author",
  },
});
themeSchema.plugin(mongoosePaginate);

// ===== Account/User =====
const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 6,
    unique: true,
  },
  image: {
    type: String,
    default: 'no name',
  },
  fullName: {
    type: String,
    minlength: 6,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    minlength: 6,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },

  avatar: { type: String, default: "" },


  admin: {
    type: Boolean,
    default: false,
  },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "product" }],

  // Thống kê
  status: {
    type: String,
    enum: ["active", "locked", "pending"],
    default: "pending",
  },
  spamCount: {
    type: Number,
    default: 0,
  },
  cancellationCount: {
    type: Number,
    default: 0,
  },
  ghostingCount: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });
accountSchema.plugin(mongoosePaginate);


// ===== News =====
const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 6
  },
  description: String,
  image: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});
newsSchema.plugin(mongoosePaginate);

// ===== Stats =====
const statsSchema = new mongoose.Schema({
  totalRevenue: {
    type: String,
    default: "0 VNĐ",
  },
  inventory: {
    type: Number,
    default: 0,
  },
  orders: {
    type: Number,
    default: 0,
  },
  change: {
    type: String,
    default: "0% so với trước",
  },
  status: {
    type: String,
    default: "success",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
statsSchema.plugin(mongoosePaginate);


// ===== Best Seller =====
const bestSellerSchema = new mongoose.Schema({
  name: String,
  image: String,
  price: Number,
  priceold: Number,
  category: String,
  tab: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


const bestseller = mongoose.model("bestseller", bestSellerSchema);
// ===== Models =====
const category = mongoose.model("category", categorySchema);
const product = mongoose.model("product", productSchema);
const theme = mongoose.model("theme", themeSchema);
const author = mongoose.model("author", authorSchema);
const account = mongoose.model("account", accountSchema);
const news = mongoose.model("news", newsSchema);
const stats = mongoose.model("stats", statsSchema);
const productsell = mongoose.model("productsell", productSellSchema);

// ===== Export =====
module.exports = {
  category,
  product,
  theme,
  author,
  account,
  news,
  stats,
  productsell,
  bestseller,
};
