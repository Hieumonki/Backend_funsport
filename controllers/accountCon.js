const { theme, author, account } = require("../model/model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

let refreshTokens = [];

const accountCon = {
  // Tạo access token
  creareToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin
      },
      process.env.ACCESS_TOKEN,
      { expiresIn: '1h' }
    );
  },

  // Tạo refresh token
  creareRefreshToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin
      },
      process.env.REFRESH_TOKEN,
      { expiresIn: '7d' }
    );
  },

  // Đăng ký tài khoản (mã hoá mật khẩu)
  addAccount: async (req, res) => {
    try {
      console.log("Dữ liệu gửi đến:", req.body);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      const newAccount = new account({
        ...req.body,
        password: hashedPassword
      });

      const savedAccount = await newAccount.save();
      console.log("Lưu thành công:", savedAccount);

      res.status(200).json(savedAccount);
    } catch (error) {
      console.error("❌ Lỗi khi lưu tài khoản:", error);
      res.status(500).json({ message: "Lỗi server", error });
    }
  },

  // Đăng nhập
login: async (req, res) => {
  try {
    const user = await account.findOne({ name: req.body.name });
    if (!user) {
      return res.status(404).json("Sai tên đăng nhập");
    }

    // ✅ So sánh mật khẩu đã mã hoá
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(403).json("Sai mật khẩu");
    }

    const accessToken = accountCon.creareToken(user);
    const refreshToken = accountCon.creareRefreshToken(user);
    refreshTokens.push(refreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      path: "/",
      sameSite: "strict"
    });

    const { password, ...others } = user._doc;
    res.status(200).json({ ...others, accessToken, refreshToken });
  } catch (error) {
    console.error("❌ Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi đăng nhập", error: error.message });
  }
},



  // Cấp lại token khi hết hạn
  requestRefreshToken: async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) return res.status(401).json("Không có token");
    if (!refreshTokens.includes(refreshToken)) {
      return res.status(403).json("Token không hợp lệ");
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) {
        console.error(err);
        return res.status(403).json("Lỗi xác thực token");
      }

      refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
      const newAccessToken = accountCon.creareToken(user);
      const newRefreshToken = accountCon.creareRefreshToken(user);
      refreshTokens.push(newRefreshToken);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict"
      });

      res.status(200).json({ accessToken: newAccessToken });
    });
  },

  // Đăng xuất
  logout: async (req, res) => {
    res.clearCookie("refreshToken");
    refreshTokens = refreshTokens.filter(token => token !== req.cookies.refreshToken);
    res.status(200).json("Đăng xuất thành công");
  }
};

module.exports = accountCon;
