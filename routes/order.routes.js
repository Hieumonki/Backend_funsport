const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');

// Thêm dòng này để xử lý doanh thu theo category
router.get('/revenue-by-category', orderController.getRevenueByCategory);

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);
router.patch('/:id/lock', orderController.toggleOrderLock);

module.exports = router;
