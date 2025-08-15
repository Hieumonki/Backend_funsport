const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');

// ================= MoMo Test Payment =================
router.post('/create-momo-test', orderController.createOrderAndPayWithMoMo); // Tạo đơn + trả URL MoMo test
router.post('/payment-notify', orderController.momoIpnHandler); // IPN từ MoMo test

// ================= Stats =================
router.get('/revenue-by-category', orderController.getRevenueByCategory);

// ================= CRUD Orders =================
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);
router.patch('/:id/lock', orderController.toggleOrderLock);

module.exports = router;
