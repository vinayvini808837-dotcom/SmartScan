const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct
} = require('../controllers/productController');

router.get('/', getProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', createProduct);

module.exports = router;
