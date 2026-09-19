const { CartService } = require('../models/Cart');
const { ProductService } = require('../models/Product');

// GET /api/cart
async function getCart(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const cart = await CartService.getCart(userId);
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/cart/add
async function addToCart(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const { barcode, productId, quantity = 1 } = req.body;

    let product;
    if (barcode) {
      product = await ProductService.findByBarcode(barcode);
    } else if (productId) {
      product = await ProductService.findById(productId);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found. Please scan a valid commodity.'
      });
    }

    const updatedCart = await CartService.addItem(product, quantity, userId);
    res.json({
      success: true,
      message: `Added "${product.name}" to cart!`,
      data: updatedCart
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/cart/item
async function updateCartItem(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const { barcodeOrId, quantity } = req.body;

    if (!barcodeOrId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'barcodeOrId and quantity are required.'
      });
    }

    const updatedCart = await CartService.updateQuantity(barcodeOrId, quantity, userId);
    res.json({
      success: true,
      message: 'Cart updated',
      data: updatedCart
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/cart/item/:id
async function removeCartItem(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const { id } = req.params;

    const updatedCart = await CartService.removeItem(id, userId);
    res.json({
      success: true,
      message: 'Item removed from cart',
      data: updatedCart
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/cart
async function clearCart(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const emptyCart = await CartService.clearCart(userId);
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: emptyCart
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
