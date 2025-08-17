const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');
const { varifyToken } = require('../controllers/middlewareCon');

// ================= MoMo Test Payment =================
router.post('/', orderController.createOrderAndPayWithMoMo);
router.patch('/:id/cancel', varifyToken, orderController.cancelOrder);
router.post('/create-momo-test', orderController.createOrderAndPayWithMoMo); // Tạo đơn + trả URL MoMo test
router.post('/payment-notify', orderController.momoIpnHandler); // IPN từ MoMo test

// ================= Stats =================
router.get('/revenue-by-category', orderController.getRevenueByCategory);

// ================= CRUD Orders =================
// Lấy đơn hàng của user hiện tại
router.get('/my', varifyToken, orderController.getOrdersByUser);

// Xem chi tiết đơn hàng (có thể thêm varifyToken nếu muốn)
router.get('/:id', varifyToken, orderController.getOrderById);

// Cập nhật đơn hàng (admin có thể dùng)
router.put('/:id', orderController.updateOrder);

// Xoá đơn hàng chỉ của user hiện tại
router.delete('/:id', varifyToken, orderController.deleteOrder);

// Khóa / mở khóa đơn hàng (admin)
router.patch('/:id/lock', orderController.toggleOrderLock);

module.exports = router;
