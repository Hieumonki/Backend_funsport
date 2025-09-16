const mongoose = require('mongoose');
const { productsell } = require("../model/model");

const productSellCon = {
  addProductSell: async (req, res) => {
    try {
      console.log("Adding product sell with data:", req.body);

      const { name, price, image, priceold, category } = req.body;

      // Validate required fields
      if (!name || !price) {
        return res.status(400).json({
          message: "Name and price are required",
          received: { name, price }
        });
      }

      // Validate price values
      if (price < 0) {
        return res.status(400).json({ message: "Price cannot be negative" });
      }

      if (priceold !== undefined && priceold < 0) {
        return res.status(400).json({ message: "Old price cannot be negative" });
      }

      const newProduct = new productsell({
        name: name.trim(),
        price: Number(price),
        image: Array.isArray(image) ? image : (image ? [image] : []), // luôn array
        priceold: priceold ? Number(priceold) : undefined,
        category: category || '',
      });


      const saved = await newProduct.save();
      console.log("Product sell saved:", saved);

      res.status(201).json(saved);
    } catch (error) {
      console.error("Error adding product sell:", error);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          message: "Validation error",
          errors: validationErrors
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
        error: error.message
      });
    }
  },

  getAllProductSell: async (req, res) => {
    try {
      const { limit, page, category, keyword } = req.query;
      const queries = {};

      // Add filters
      if (keyword) {
        queries.name = { $regex: new RegExp(keyword, 'i') };
      }

      if (category && category !== 'all') {
        queries.category = category;
      }

      let query = productsell.find(queries).sort({ createdAt: -1 });

      // Add pagination if specified
      if (limit) {
        query = query.limit(parseInt(limit));
      }

      if (page && limit) {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        query = query.skip(skip);
      }

      const data = await query.exec();
      console.log(`Retrieved ${data.length} product sell items`);

      res.status(200).json(data);
    } catch (error) {
      console.error("Error getting all product sell:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  getOneProductSell: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const data = await productsell.findById(id);

      if (!data) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json(data);
    } catch (error) {
      console.error("Error getting product sell:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  updateProductSell: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const updateData = { ...req.body };

      // Validate price values if being updated
      if (updateData.price !== undefined) {
        if (updateData.price < 0) {
          return res.status(400).json({ message: "Price cannot be negative" });
        }
        updateData.price = Number(updateData.price);
      }

      if (updateData.priceold !== undefined) {
        if (updateData.priceold < 0) {
          return res.status(400).json({ message: "Old price cannot be negative" });
        }
        updateData.priceold = Number(updateData.priceold);
      }

      // Trim name if being updated
      if (updateData.name) {
        updateData.name = updateData.name.trim();
      }

      const updatedProduct = await productsell.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Product sell updated:", updatedProduct);
      res.status(200).json({
        message: "Cập nhật thành công",
        product: updatedProduct
      });
    } catch (error) {
      console.error("Error updating product sell:", error);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          message: "Validation error",
          errors: validationErrors
        });
      }

      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  deleteProductSell: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const deletedProduct = await productsell.findByIdAndDelete(id);

      if (!deletedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Product sell deleted:", deletedProduct._id);
      res.status(200).json({
        message: "Xóa thành công",
        deletedProduct: deletedProduct
      });
    } catch (error) {
      console.error("Error deleting product sell:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  // Additional useful methods
  getProductSellStats: async (req, res) => {
    try {
      const totalProducts = await productsell.countDocuments();
      const productsByCategory = await productsell.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            avgPrice: { $avg: "$price" },
            totalValue: { $sum: "$price" }
          }
        }
      ]);

      const stats = {
        totalProducts,
        productsByCategory
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error("Error getting product sell stats:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  searchProductSell: async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || q.trim() === '') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const searchQuery = {
        $or: [
          { name: { $regex: new RegExp(q, 'i') } },
          { category: { $regex: new RegExp(q, 'i') } }
        ]
      };

      const results = await productsell.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(20);

      res.status(200).json(results);
    } catch (error) {
      console.error("Error searching product sell:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  }
};

module.exports = productSellCon;