const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');
const { varifyToken } = require('../controllers/middlewareCon');

// MoMo
router.post('/', varifyToken, orderController.createOrderAndPayWithMoMo);
router.post('/create-momo-test', varifyToken, orderController.createOrderAndPayWithMoMo);
router.post('/payment-notify', orderController.momoIpnHandler);

// Stats
router.get('/revenue-by-category', orderController.getRevenueByCategory);

// Orders user
router.get('/my', varifyToken, orderController.getOrdersByUser);
router.get('/:id', varifyToken, orderController.getOrderById);
router.patch('/:id/cancel', varifyToken, orderController.cancelOrder);

// Orders admin
router.get('/', orderController.getAllOrders);            // ✅ thêm route lấy tất cả orders
router.put('/:id', orderController.updateOrder);
router.delete('/:id', varifyToken, orderController.deleteOrder);
router.patch('/:id/lock', orderController.toggleOrderLock);

module.exports = router;
