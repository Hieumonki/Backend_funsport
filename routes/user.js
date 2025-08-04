const router = require("express").Router();
const middlewareCon = require("../controllers/middlewareCon");
const userCon = require("../controllers/userCon");

// ⚠ Đặt trước để không bị nuốt bởi "/:id"
router.get("/me", middlewareCon.varifyToken, userCon.getMe);

router.get("/stats", middlewareCon.varifyTokenAndAdminAuth, userCon.getUserStats);

router.get("/", middlewareCon.varifyToken, userCon.getUser);
router.get("/:id", middlewareCon.varifyToken, userCon.getAnUser);
router.put("/:id", middlewareCon.varifyToken, userCon.updateUser);
router.delete("/:id", middlewareCon.varifyTokenAndAdminAuth, userCon.deleteUser);

router.post("/toggle-lock/:id", middlewareCon.varifyTokenAndAdminAuth, userCon.toggleLockUser);
router.post("/toggle-product-lock/:id", middlewareCon.varifyTokenAndAdminAuth, userCon.toggleProductLock);
router.post("/report-violation/:id", middlewareCon.varifyToken, userCon.reportViolation);
router.post("/bulk", middlewareCon.varifyTokenAndAdminAuth, userCon.deleteUsers);

if (process.env.NODE_ENV === 'development') {
  router.get("/test/get", userCon.getUser);
  router.get("/test/get/:id", userCon.getAnUser);
  router.put("/test/put/:id", userCon.updateUser);
  router.delete("/test/delete/:id", userCon.deleteUser);
}

module.exports = router;
