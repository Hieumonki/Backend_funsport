const router = require("express").Router();
const middlewareCon = require("../controllers/middlewareCon");
const { userCon, uploadAvatar } = require("../controllers/userCon");



router.put('/me', varifyToken, uploadAvatar.single('avatar'), userCon.updateMe);
// 📌 Lấy thông tin user đang đăng nhập
router.get("/me", middlewareCon.varifyToken, userCon.getMe);

// 📌 Đổi mật khẩu user đang đăng nhập
router.put("/me/password", middlewareCon.varifyToken, userCon.changePassword);

// 📊 Thống kê user (chỉ admin)
router.get("/stats", middlewareCon.varifyTokenAndAdminAuth, userCon.getUserStats);

// 📌 Quản lý user (admin hoặc quyền phù hợp)
router.get("/", middlewareCon.varifyToken, userCon.getUser);
router.get("/:id", middlewareCon.varifyToken, userCon.getAnUser);
router.put("/:id", middlewareCon.varifyToken, userCon.updateUser);
router.delete("/:id", middlewareCon.varifyTokenAndAdminAuth, userCon.deleteUser);

// 📌 Các chức năng nâng cao
router.post("/toggle-lock/:id", middlewareCon.varifyTokenAndAdminAuth, userCon.toggleLockUser);
router.post("/toggle-product-lock/:id", middlewareCon.varifyTokenAndAdminAuth, userCon.toggleProductLock);
router.post("/report-violation/:id", middlewareCon.varifyToken, userCon.reportViolation);
router.post("/bulk", middlewareCon.varifyTokenAndAdminAuth, userCon.deleteUsers);

// 📌 Chỉ cho môi trường DEV
if (process.env.NODE_ENV === 'development') {
  router.get("/test/get", userCon.getUser);
  router.get("/test/get/:id", userCon.getAnUser);
  router.put("/test/put/:id", userCon.updateUser);
  router.delete("/test/delete/:id", userCon.deleteUser);
}

module.exports = router;
