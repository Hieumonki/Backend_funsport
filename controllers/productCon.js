const { product, category, author } = require("../model/model"); // Import from your model.js file
const mongoose = require("mongoose");

const productCon = {
  // Get product statistics
  getProductStats: async (req, res) => {
    try {
      const totalProducts = await product.countDocuments();
      const inStockProducts = await product.countDocuments({ status: "instock" });
      const outOfStockProducts = await product.countDocuments({ status: "outofstock" });
      const lowStockProducts = await product.countDocuments({ status: "lowstock" });

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

  // Add product (your existing code)
  addproduct: async (req, res) => {
    try {
      console.log("Request body:", req.body);
      
      const { 
        name, 
        desc, 
        category: categoryId, 
        image, 
        price, 
        quantity, 
        minStock, 
        color, 
        tab, 
        describe, 
        author: authorId 
      } = req.body;

      // Validate required fields
      if (!name || !price || quantity === undefined || !categoryId) {
        return res.status(400).json({ 
          message: "Name, price, quantity, and category are required",
          received: { name, price, quantity, categoryId }
        });
      }

      // Validate category exists
      const categoryDoc = await category.findById(categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Process color field - handle different formats
      let processedColor = '#000000'; // Default color
      
      if (color) {
        try {
          // If color is a JSON string, try to parse it
          if (typeof color === 'string' && color.startsWith('[')) {
            const parsedColor = JSON.parse(color);
            processedColor = Array.isArray(parsedColor) ? parsedColor : color;
          } else if (typeof color === 'string') {
            // Validate hex color format
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
              processedColor = color;
            } else {
              return res.status(400).json({ message: "Invalid color format. Use hex format like #FF0000" });
            }
          } else if (Array.isArray(color)) {
            // Validate array of hex colors
            const validColors = color.every(c => 
              typeof c === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c)
            );
            if (validColors) {
              processedColor = color;
            } else {
              return res.status(400).json({ message: "All colors must be in hex format like #FF0000" });
            }
          }
        } catch (parseError) {
          console.warn("Color parsing error:", parseError);
          processedColor = '#000000'; // Fallback to default
        }
      }

      // Calculate status based on quantity
      const calculatedMinStock = minStock || 5;
      let status = "instock";
      if (quantity === 0) {
        status = "outofstock";
      } else if (quantity <= calculatedMinStock) {
        status = "lowstock";
      }

      const newProduct = new product({
        name,
        desc,
        category: categoryId,
        image: Array.isArray(image) ? image : [image || ''],
        price: Number(price),
        quantity: Number(quantity),
        minStock: calculatedMinStock,
        color: processedColor,
        tab,
        describe,
        author: authorId,
        status: status,
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
      const populatedProduct = await product.findById(savedProduct._id).populate('category', 'name');

      res.status(201).json(populatedProduct);
    } catch (error) {
      console.error("Error adding product:", error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationErrors,
          details: error.errors
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({ 
          message: "Duplicate product name", 
          field: Object.keys(error.keyPattern)[0] 
        });
      }

      res.status(500).json({ 
        message: "Server error", 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Get all products
  getAllproduct: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const products = await product.find()
        .populate('category', 'name')
        .populate('author', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await product.countDocuments();

      res.status(200).json({
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
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
        .populate('category', 'name')
        .populate('author', 'name email');

      if (!foundProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json(foundProduct);
    } catch (error) {
      console.error("Error getting product:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update product (your existing code)
  updateproduct: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const { quantity, minStock, color, ...otherFields } = req.body;

      // Process color field for update
      let processedColor;
      if (color !== undefined) {
        try {
          if (typeof color === 'string' && color.startsWith('[')) {
            const parsedColor = JSON.parse(color);
            processedColor = Array.isArray(parsedColor) ? parsedColor : color;
          } else if (typeof color === 'string') {
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
              processedColor = color;
            } else {
              return res.status(400).json({ message: "Invalid color format. Use hex format like #FF0000" });
            }
          } else if (Array.isArray(color)) {
            const validColors = color.every(c => 
              typeof c === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c)
            );
            if (validColors) {
              processedColor = color;
            } else {
              return res.status(400).json({ message: "All colors must be in hex format like #FF0000" });
            }
          }
        } catch (parseError) {
          console.warn("Color parsing error:", parseError);
          return res.status(400).json({ message: "Invalid color data format" });
        }
      }

      // Recalculate status if quantity is being updated
      if (quantity !== undefined) {
        const calculatedMinStock = minStock || 5;
        let status = "instock";
        if (quantity === 0) {
          status = "outofstock";
        } else if (quantity <= calculatedMinStock) {
          status = "lowstock";
        }
        otherFields.status = status;
      }

      const updateData = { 
        ...otherFields, 
        quantity, 
        minStock,
        ...(processedColor !== undefined && { color: processedColor })
      };

      const updatedProduct = await product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('category', 'name');

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json(updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationErrors 
        });
      }
      
      res.status(500).json({ message: 'Server error', error: error.message });
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
        .populate('category', 'name')
        .populate('author', 'name email')
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