const { product, category, author } = require("../model/model"); 
const mongoose = require("mongoose");

const productCon = {
  // Get product statistics
  getProductStats: async (req, res) => {
    try {
      const totalProducts = await product.countDocuments();
      const products = await product.find({}, "variants minStock");

      let inStockProducts = 0, outOfStockProducts = 0, lowStockProducts = 0;

      products.forEach(p => {
        const totalStock = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        if (totalStock === 0) outOfStockProducts++;
        else if (totalStock <= (p.minStock || 5)) lowStockProducts++;
        else inStockProducts++;
      });

      res.status(200).json({
        total: totalProducts,
        inStock: inStockProducts,
        outOfStock: outOfStockProducts,
        lowStock: lowStockProducts
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get random products
  getRandomProducts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const randomProducts = await product.aggregate([
        { $sample: { size: limit } },
        { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
      ]);
      res.status(200).json(randomProducts);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Add product
  addproduct: async (req, res) => {
    try {
      // Parse variants (nếu frontend gửi form-data)
      let variants = req.body.variants;
      if (typeof variants === "string") {
        try {
          variants = JSON.parse(variants);
        } catch {
          return res.status(400).json({ message: "Invalid variants format" });
        }
      }

      const {
        name, 
        desc, 
        category: categoryId, 
        minStock, 
        tab, 
        describe, 
        author: authorId 
      } = req.body;

      if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ message: "Name, category, and at least one variant are required" });
      }

      // Validate category
      const categoryDoc = await category.findById(categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Lấy ảnh từ multer
      const images = req.files && req.files.length > 0
        ? req.files.map(file => file.filename)
        : [];

      // Tính status
      const calculatedMinStock = minStock || 5;
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      let status = "instock";
      if (totalStock === 0) status = "outofstock";
      else if (totalStock <= calculatedMinStock) status = "lowstock";

      const newProduct = new product({
        name,
        desc,
        category: categoryId,
        image: images,
        variants,
        minStock: calculatedMinStock,
        tab,
        describe,
        author: authorId,
        status
      });

      const savedProduct = await newProduct.save();

      // Gắn product vào author
      if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
        await author.findByIdAndUpdate(authorId, {
          $push: { product: savedProduct._id }
        });
      }

      const populatedProduct = await product.findById(savedProduct._id).populate("category", "name");
      res.status(201).json(populatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all products
  getAllproduct: async (req, res) => {
    try {
      const { keyword, category: categoryId } = req.query;
      let filter = {};

      if (keyword) {
        filter.$or = [
          { name: { $regex: keyword, $options: "i" } },
          { desc: { $regex: keyword, $options: "i" } }
        ];
      }

      if (categoryId) {
        filter.category = categoryId;
      }

      const products = await product.find(filter)
        .populate("category", "name")
        .populate("author", "name")
        .sort({ createdAt: -1 });

      res.status(200).json({ products, total: products.length });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get a single product
  getAnproduct: async (req, res) => {
    try {
      console.log("👉 Find product with ID:", req.params.id); 
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const foundProduct = await product.findById(req.params.id)
        .populate("category", "name")
        .populate("author", "name email");
      if (!foundProduct) {
        console.log("❌ Not found in DB");
        return res.status(404).json({ message: "Product not found" });
      }
      console.log("✅ Found product:", foundProduct);
      res.status(200).json(foundProduct);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update product
  updateproduct: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      let variants = req.body.variants;
      if (typeof variants === "string") {
        try {
          variants = JSON.parse(variants);
        } catch {
          return res.status(400).json({ message: "Invalid variants format" });
        }
      }

      const { minStock, ...otherFields } = req.body;

      // Xử lý ảnh mới nếu có
      let images = undefined;
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => file.filename);
      }

      // Tính status
      let status;
      if (variants && Array.isArray(variants)) {
        const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        if (totalStock === 0) status = "outofstock";
        else if (totalStock <= (minStock || 5)) status = "lowstock";
        else status = "instock";
      }

      const updateData = { 
        ...otherFields, 
        ...(variants && { variants }),
        ...(minStock && { minStock }),
        ...(status && { status }),
        ...(images && { image: images })
      };

      const updatedProduct = await product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate("category", "name");

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Delete product
  deleteproduct: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const deletedProduct = await product.findByIdAndDelete(req.params.id);
      if (!deletedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (deletedProduct.author) {
        await author.findByIdAndUpdate(deletedProduct.author, {
          $pull: { product: deletedProduct._id }
        });
      }
      res.status(200).json({ message: "Product deleted successfully", product: deletedProduct });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get products by user
  getProductsByUser: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const products = await product.find({ author: req.params.userId })
        .populate("category", "name")
        .populate("author", "name email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await product.countDocuments({ author: req.params.userId });

      res.status(200).json({
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};

module.exports = productCon;
