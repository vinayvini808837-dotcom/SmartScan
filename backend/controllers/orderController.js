const { OrderService } = require('../models/Order');
const { CartService } = require('../models/Cart');

// POST /api/orders/checkout
async function checkout(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const { customerInfo, paymentMethod } = req.body;

    // Fetch active cart
    const cart = await CartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Scan products before checking out!'
      });
    }

    // Create confirmed order
    const order = await OrderService.createFromCart(cart, customerInfo, paymentMethod);

    // Clear cart after successful checkout
    await CartService.clearCart(userId);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/orders
async function getOrders(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'guest_user';
    const orders = await OrderService.getOrders(userId);
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/orders/:orderId
async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  checkout,
  getOrders,
  getOrderById
};
