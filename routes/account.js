
const router = require("express").Router();
const accountCon = require("../controllers/accountCon");
const middlewareCon = require("../controllers/middlewareCon");
const upload = require("../middlewares/upload"); 
const accountCon = {
  // Đăng ký tài khoản
  addAccount: async (req, res) => {
    try {
      const { name, email, password, fullName, phone } = req.body;

      let errors = [];

      // Kiểm tra trùng name
      const existingName = await Account.findOne({ name });
      if (existingName) {
        errors.push("Tên tài khoản đã tồn tại");
      }

      // Kiểm tra trùng email
      const existingEmail = await Account.findOne({ email });
      if (existingEmail) {
        errors.push("Email đã được sử dụng");
      }

      // Nếu có lỗi → trả về luôn
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      // Tạo mới
      const newAccount = new Account({
        name,
        email,
        password,
        fullName,
        phone
      });

      await newAccount.save();
      res.status(201).json({ message: "Thêm tài khoản thành công" });

    } catch (err) {
      // Bắt lỗi unique index từ MongoDB
      if (err.code === 11000) {
        let errors = [];
        if (err.keyPattern?.name) {
          errors.push("Tên tài khoản đã tồn tại");
        }
        if (err.keyPattern?.email) {
          errors.push("Email đã được sử dụng");
        }
        return res.status(400).json({ errors });
      }

      console.error("Lỗi khi thêm tài khoản:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  },

  // Đăng nhập
  login: async (req, res) => {
    try {
      const { name, password } = req.body;
      const user = await Account.findOne({ name, password });
      if (!user) {
        return res.status(400).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
      }
      // Xử lý tạo token hoặc session tại đây
      res.json({ message: "Đăng nhập thành công", user });
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  },

  // Đăng xuất
  logout: async (req, res) => {
    try {
      // Xử lý xoá token/session ở đây
      res.json({ message: "Đăng xuất thành công" });
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  },

  // Refresh token
  requestRefreshToken: async (req, res) => {
    try {
      // Xử lý tạo refresh token mới ở đây
      res.json({ message: "Tạo refresh token mới thành công" });
    } catch (err) {
      console.error("Lỗi refresh token:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }
};

module.exports = router;
