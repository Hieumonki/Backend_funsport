const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  desc: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
  image: [String],
  price: Number,
  quantity: Number,
  minStock: Number,
  color: {
    type: String,
    default: '#000000',
    validate: {
      validator: function(v) {
        return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color (e.g., #FF0000)'
    }
  },
  tab: String,
  describe: String,
  status: {
    type: String,
    enum: ["instock", "lowstock", "outofstock"],
    default: "instock",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "author",
  },
}, { timestamps: true });
productSchema.plugin(mongoosePaginate);

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 6,
    unique: true,
  },
  image: String,
}, { timestamps: true });
categorySchema.plugin(mongoosePaginate);

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
}, { timestamps: true });
themeSchema.plugin(mongoosePaginate);

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
}, { timestamps: true });
authorSchema.plugin(mongoosePaginate);

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

const productSellSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  priceold: {
    type: Number,
    min: 0
  },
  category: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
productSellSchema.plugin(mongoosePaginate);

const bestSellerSchema = new mongoose.Schema({
  name: String,
  image: String,
  price: {
    type: Number,
    min: 0
  },
  priceold: {
    type: Number,
    min: 0
  },
  category: String,
  tab: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
bestSellerSchema.plugin(mongoosePaginate);

module.exports = {
  category: mongoose.model("category", categorySchema),
  product: mongoose.model("product", productSchema),
  theme: mongoose.model("theme", themeSchema),
  author: mongoose.model("author", authorSchema),
  account: mongoose.model("account", accountSchema),
  news: mongoose.model("news", newsSchema),
  stats: mongoose.model("stats", statsSchema),
  productsell: mongoose.model("productsell", productSellSchema),
  bestseller: mongoose.model("bestseller", bestSellerSchema),
};