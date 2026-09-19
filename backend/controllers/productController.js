const { ProductService } = require('../models/Product');

// GET /api/products
async function getProducts(req, res) {
  try {
    const { search, category, compliant } = req.query;
    let products;

    if (search) {
      products = await ProductService.search(search);
    } else {
      const query = {};
      if (category) query.category = category;
      if (compliant !== undefined) query.isCompliant = compliant === 'true';
      products = await ProductService.find(query);
    }

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/products/barcode/:barcode
async function getProductByBarcode(req, res) {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const product = await ProductService.findByBarcode(barcode);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No product found in catalog with barcode: ${barcode}`,
        scannedBarcode: barcode
      });
    }

    res.json({
      success: true,
      message: 'Product retrieved successfully by barcode',
      data: product
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/products/:id
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await ProductService.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/products
async function createProduct(req, res) {
  try {
    const { barcode, name, mrp, netQuantity } = req.body;
    if (!barcode || !name || !mrp || !netQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Mandatory fields missing: barcode, name, mrp, netQuantity'
      });
    }

    const existing = await ProductService.findByBarcode(barcode);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Product with barcode ${barcode} already exists.`
      });
    }

    const product = await ProductService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Product registered successfully',
      data: product
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct
};
