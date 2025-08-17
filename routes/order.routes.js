const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');
const { varifyToken, isAdmin } = require('../controllers/middlewareCon');

// ================= MoMo =================
router.post('/', varifyToken, orderController.createOrderAndPayWithMoMo);
router.post('/create-momo-test', varifyToken, orderController.createOrderAndPayWithMoMo);
router.post('/payment-notify', orderController.momoIpnHandler);

// ================= Stats =================
router.get('/revenue-by-category', isAdmin, orderController.getRevenueByCategory);

// ================= Orders (User) =================
router.get('/my', varifyToken, orderController.getOrdersByUser);
router.get('/:id', varifyToken, orderController.getOrderById);
router.patch('/code/:orderId/cancel', varifyToken, orderController.cancelOrderByCode);
router.patch('/:id/cancel', varifyToken, orderController.cancelOrder);

// ================= Orders (Admin) =================
router.get('/', isAdmin, orderController.getAllOrders);   // chỉ admin mới được lấy tất cả
router.put('/:id', isAdmin, orderController.updateOrder);
router.delete('/:id', isAdmin, orderController.deleteOrder);
router.patch('/:id/lock', isAdmin, orderController.toggleOrderLock);

module.exports = router;
