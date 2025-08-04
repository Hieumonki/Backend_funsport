const { productsell } = require("../model/model");

const productSellCon = {
  addProductSell: async (req, res) => {
    try {
      const newProduct = new productsell(req.body);
      const saved = await newProduct.save();
      res.status(200).json(saved);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getAllProductSell: async (req, res) => {
    try {
      const data = await productsell.find();
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getOneProductSell: async (req, res) => {
    try {
      const data = await productsell.findById(req.params.id);
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  updateProductSell: async (req, res) => {
    try {
      await productsell.findByIdAndUpdate(req.params.id, { $set: req.body });
      res.status(200).json("Cập nhật thành công");
    } catch (err) {
      res.status(500).json(err);
    }
  },

  deleteProductSell: async (req, res) => {
    try {
      await productsell.findByIdAndDelete(req.params.id);
      res.status(200).json("Xóa thành công");
    } catch (err) {
      res.status(500).json(err);
    }
  },
};

module.exports = productSellCon;
