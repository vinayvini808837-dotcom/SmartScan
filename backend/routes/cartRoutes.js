const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require('../controllers/cartController');

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/item', updateCartItem);
router.delete('/item/:id', removeCartItem);
router.delete('/', clearCart);

module.exports = router;
