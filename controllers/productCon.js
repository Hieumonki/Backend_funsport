const mongoose = require('mongoose');

const { theme, author, product, products } = require("../model/model");
const productCon = {

  addproduct: async (req, res) => {
    try {
      const newproduct = new product(req.body);
      const saveproduct = await newproduct.save();
      if (req.body.author) {
        const authorData = await author.findById(req.body.author);
        if (authorData) {
          authorData.product.push(saveproduct._id);
          await authorData.save();
        } else {
          // Xử lý trường hợp không tìm thấy tác giả
        }
      }
      res.status(200).json(saveproduct);
    } catch (error) {
      res.status(500).json(error);
    }
  },
getAllproduct: async (req, res) => {
  try {
    const { keyword, category } = req.query;
    const limit = parseInt(req.query.limit) || 50;

    const queries = {};

    if (keyword) {
      queries.name = { $regex: new RegExp(keyword, 'i') };
    }

    if (category) {
      queries.category = category;
    }

    // Thêm populate để lấy tên category
    const productsList = await product.find(queries)
      .limit(limit)
      .populate('category', 'name'); // lấy trường name của category

    res.status(200).json(productsList);
  } catch (error) {
    console.error('Lỗi lấy sản phẩm:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
},



  getAnproduct: async (req, res) => {
    try {
      const products = await product.findById(req.params.id);
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json(error);
    }
  },
  updateproduct: async (req, res) => {
    try {
      const productToUpdate = await product.findById(req.params.id);
      await productToUpdate.updateOne({ $set: req.body });
      res.status(200).json("Cập nhật thành công !!!");
    } catch (error) {
      res.status(500).json(error);
    }
  },
  deleteproduct: async (req, res) => {
    try {
      await product.findByIdAndDelete(req.params.id);

      res.status(200).json("Xóa thành công !!!");
    } catch (error) {
      res.status(500).json(error);
    }
  },
getRandomProducts: async (req, res) => {
  try {
    const { limit = 4, exclude, category } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }

    // Xử lý đúng kiểu ObjectId khi loại trừ sản phẩm hiện tại
    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      query._id = { $ne: new mongoose.Types.ObjectId(exclude) };
    }

    const productsRandom = await product.aggregate([
      { $match: query },
      { $sample: { size: parseInt(limit) } }
    ]);

    res.status(200).json(productsRandom);
  } catch (error) {
    console.error("Lỗi lấy sản phẩm gợi ý:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
},

getProductStats: async (req, res) => {
  try {
    const stats = await product.aggregate([
      {
        $group: {
          _id: "$category",         // Thống kê theo danh mục
          total: { $sum: 1 }        // Tổng số sản phẩm mỗi danh mục
        }
      }
    ]);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê sản phẩm:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
}


};

module.exports = productCon;
