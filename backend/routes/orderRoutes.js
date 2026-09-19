const express = require('express');
const router = express.Router();
const {
  checkout,
  getOrders,
  getOrderById
} = require('../controllers/orderController');

router.post('/checkout', checkout);
router.get('/', getOrders);
router.get('/:orderId', getOrderById);

module.exports = router;
