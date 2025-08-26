const jwt = require("jsonwebtoken");

const middlewareCon = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: "Token hết hạn hoặc không hợp lệ" });
        }

        // ✅ Gắn payload vào req.user
        req.user = {
          id: decoded.id || decoded._id, // 👈 bảo đảm luôn có id
          admin: decoded.admin || false
        };

        console.log("✅ Token decode:", req.user); // debug
        next();
      });
    } else {
      res.status(401).json({ message: "Chưa được xác thực" });
    }
  },

  verifyTokenAndAdminAuth: (req, res, next) => {
    middlewareCon.verifyToken(req, res, () => {
      if (req.user.id === req.params.id || req.user.admin) {
        next();
      } else {
        res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
      }
    });
  },

  isAdmin: (req, res, next) => {
    middlewareCon.verifyToken(req, res, () => {
      if (req.user && req.user.admin) {
        next();
      } else {
        res.status(403).json({ message: "Chỉ admin mới được phép thực hiện thao tác này" });
      }
    });
  }
};

module.exports = middlewareCon;
