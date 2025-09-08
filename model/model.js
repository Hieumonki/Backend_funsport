const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/* ===== Variant Schema (color + size + price + stock) ===== */
const variantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  size: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0 },
});

/* ===== Product Schema ===== */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    desc: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
    image: [String],
    variants: [variantSchema], // 🔥 thay cho price, quantity, color
    minStock: {
      type: Number,
      default: 5,
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
  },
  { timestamps: true }
);
productSchema.plugin(mongoosePaginate);

/* ===== Category Schema ===== */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 6,
      unique: true,
    },
    image: String,
  },
  { timestamps: true }
);
categorySchema.plugin(mongoosePaginate);

/* ===== Theme Schema ===== */
const themeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "no name",
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
  },
  { timestamps: true }
);
themeSchema.plugin(mongoosePaginate);

/* ===== Author Schema ===== */
const authorSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
);
authorSchema.plugin(mongoosePaginate);

/* ===== Account Schema ===== */
const accountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 6,
      unique: true,
    },
    image: {
      type: String,
      default: "no name",
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
    phone: {
      type: String,
      match: [/^[0-9]{9,12}$/, "Số điện thoại không hợp lệ"], // 9-12 số
    },
    address: {
      type: String,
      maxlength: 255,
      trim: true,
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
    },
  },
  { timestamps: true }
);
accountSchema.plugin(mongoosePaginate);

/* ===== News Schema ===== */
const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 6,
  },
  description: String,
  image: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
newsSchema.plugin(mongoosePaginate);

/* ===== Stats Schema ===== */
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

/* ===== ProductSell Schema ===== */
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
    min: 0,
  },
  priceold: {
    type: Number,
    min: 0,
  },
  category: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
productSellSchema.plugin(mongoosePaginate);

/* ===== BestSeller Schema ===== */
const bestSellerSchema = new mongoose.Schema({
  name: String,
  image: String,
  price: {
    type: Number,
    min: 0,
  },
  priceold: {
    type: Number,
    min: 0,
  },
  category: String,
  tab: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
bestSellerSchema.plugin(mongoosePaginate);

/* ===== Export Models ===== */
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
