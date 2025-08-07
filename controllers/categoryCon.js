const { theme, author, category } = require("../model/model");

const categoryCon = {
  // Thêm danh mục
  addcategory: async (req, res) => {
    try {
      const data = req.body;

      console.log("🔥 Dữ liệu nhận được:", data);

      // Xoá _id nếu là chuỗi rỗng hoặc null
      if (!data._id || data._id === "") {
        delete data._id;
      }

      const newcategory = new category(data);
      const savecategory = await newcategory.save();

      // Nếu có author thì thêm tham chiếu
      if (data.author) {
        const authorData = await author.findById(data.author);
        if (authorData) {
          authorData.category.push(savecategory._id);
          await authorData.save();
        }
      }

      res.status(200).json(savecategory);
    } catch (error) {
      console.error("❌ Lỗi khi thêm category:", error);
      if (error.code === 11000) {
        res.status(400).json({ message: "Mã danh mục đã tồn tại!" });
      } else {
        res.status(500).json({ message: error.message || "Lỗi máy chủ." });
      }
    }
  },

  // Lấy tất cả danh mục
  getAllcategory: async (req, res) => {
    try {
      const categorys = await category.find();
      res.status(200).json(categorys);
    } catch (error) {
      console.error("❌ Lỗi khi lấy tất cả danh mục:", error);
      res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
  },

  // Lấy một danh mục theo ID
  getAncategory: async (req, res) => {
    try {
      const categorys = await category.findById(req.params.id);
      res.status(200).json(categorys);
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh mục:", error);
      res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
  },

  // Cập nhật danh mục
  updatecategory: async (req, res) => {
    try {
      const categoryToUpdate = await category.findById(req.params.id);
      if (!categoryToUpdate) {
        return res.status(404).json({ message: "Không tìm thấy danh mục." });
      }

      await categoryToUpdate.updateOne({ $set: req.body });
      res.status(200).json("Cập nhật thành công.");
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật danh mục:", error);
      res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
  },

  // Xóa danh mục
  deletecategory: async (req, res) => {
    try {
      const deleted = await category.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Không tìm thấy danh mục để xoá." });
      }

      res.status(200).json("Xoá thành công.");
    } catch (error) {
      console.error("❌ Lỗi khi xoá danh mục:", error);
      res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
  },

  // Lấy tất cả category có status === 'active' (dành cho user)
  getActiveCategories: async (req, res) => {
    try {
      const categories = await category.find({ status: 'active' });
      res.status(200).json(categories);
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh mục active:", error);
      res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
  }
};

module.exports = categoryCon;
