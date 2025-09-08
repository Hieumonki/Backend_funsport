const { product, category, author } = require("../model/model"); 
const mongoose = require("mongoose");

const productCon = {
  // Get product statistics
  getProductStats: async (req, res) => {
    try {
      const totalProducts = await product.countDocuments();

      // Tính toán theo variants
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
      console.error("Error getting product stats:", error);
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
      console.error("Error getting random products:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Add product
  addproduct: async (req, res) => {
    try {
      console.log("Request body:", req.body);
      
      const { 
        name, 
        desc, 
        category: categoryId, 
        image, 
        variants, 
        minStock, 
        tab, 
        describe, 
        author: authorId 
      } = req.body;

      // Validate required fields
      if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ 
          message: "Name, category, and at least one variant are required",
          received: { name, categoryId, variants }
        });
      }

      // Validate category exists
      const categoryDoc = await category.findById(categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Calculate status based on variants stock
      const calculatedMinStock = minStock || 5;
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      let status = "instock";
      if (totalStock === 0) {
        status = "outofstock";
      } else if (totalStock <= calculatedMinStock) {
        status = "lowstock";
      }

      const newProduct = new product({
        name,
        desc,
        category: categoryId,
        image: Array.isArray(image) ? image : [image || ""],
        variants,
        minStock: calculatedMinStock,
        tab,
        describe,
        author: authorId,
        status
      });

      console.log("Product to save:", newProduct);

      const savedProduct = await newProduct.save();
      console.log("Product saved:", savedProduct);

      // Update author's product list if author is provided
      if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
        try {
          const authorData = await author.findById(authorId);
          if (authorData) {
            authorData.product = authorData.product || [];
            authorData.product.push(savedProduct._id);
            await authorData.save();
          }
        } catch (authorError) {
          console.warn("Could not update author's product list:", authorError.message);
        }
      }

      // Populate category information before returning
      const populatedProduct = await product.findById(savedProduct._id).populate("category", "name");

      res.status(201).json(populatedProduct);
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all products with search & filter (no pagination backend)
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

      res.status(200).json({
        products,
        total: products.length
      });
    } catch (error) {
      console.error("Error getting all products:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get a single product
  getAnproduct: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const foundProduct = await product.findById(req.params.id)
        .populate("category", "name")
        .populate("author", "name email");

      if (!foundProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json(foundProduct);
    } catch (error) {
      console.error("Error getting product:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update product
  updateproduct: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const { variants, minStock, ...otherFields } = req.body;

      // Recalculate status if variants updated
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
        ...(status && { status })
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
      console.error("Error updating product:", error);
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

      // Remove product from author's product list if author exists
      if (deletedProduct.author) {
        try {
          await author.findByIdAndUpdate(
            deletedProduct.author,
            { $pull: { product: deletedProduct._id } }
          );
        } catch (authorError) {
          console.warn("Could not update author's product list:", authorError.message);
        }
      }

      res.status(200).json({ message: "Product deleted successfully", product: deletedProduct });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get products by user/author
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
      console.error("Error getting products by user:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};

module.exports = productCon;
