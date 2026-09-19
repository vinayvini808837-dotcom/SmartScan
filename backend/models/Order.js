const mongoose = require('mongoose');
const { isMongoDBConnected, fallbackStore, persistData } = require('../config/db');

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    default: 'guest_user'
  },
  items: [{
    productId: String,
    barcode: String,
    name: String,
    brand: String,
    price: Number,
    quantity: Number,
    subtotal: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'UPI / Digital Payment'
  },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PENDING', 'FAILED'],
    default: 'PAID'
  },
  orderStatus: {
    type: String,
    enum: ['CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'],
    default: 'CONFIRMED'
  },
  customerInfo: {
    name: { type: String, default: 'Self-Checkout User' },
    email: { type: String, default: 'consumer@smartscan.nic.in' },
    phone: { type: String, default: '+91 9876543210' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const OrderModel = mongoose.model('Order', OrderSchema);

function generateOrderId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${new Date().getFullYear()}-${rand}`;
}

const OrderService = {
  async createFromCart(cart, customerInfo = {}, paymentMethod = 'UPI / Smart Pay') {
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty. Scan items before checkout.');
    }

    const orderData = {
      orderId: generateOrderId(),
      userId: cart.userId || 'guest_user',
      items: cart.items.map(item => ({
        productId: item.productId,
        barcode: item.barcode,
        name: item.name,
        brand: item.brand || '',
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      subtotal: cart.subtotal,
      tax: cart.tax,
      totalAmount: cart.total,
      paymentMethod,
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      customerInfo: {
        name: customerInfo.name || 'SmartScan Self-Checkout Consumer',
        email: customerInfo.email || 'user@smartscan.in',
        phone: customerInfo.phone || '+91 9876543210'
      },
      createdAt: new Date()
    };

    if (isMongoDBConnected()) {
      const order = await OrderModel.create(orderData);
      return order;
    }

    const newOrder = {
      _id: 'ord_' + Date.now(),
      ...orderData
    };
    fallbackStore.orders.unshift(newOrder);
    persistData();
    return newOrder;
  },

  async getOrders(userId = 'guest_user') {
    if (isMongoDBConnected()) {
      return await OrderModel.find({ userId }).sort({ createdAt: -1 });
    }
    return fallbackStore.orders;
  },

  async getOrderById(orderId) {
    if (isMongoDBConnected()) {
      return await OrderModel.findOne({ orderId });
    }
    return fallbackStore.orders.find(o => o.orderId === orderId || o._id === orderId) || null;
  }
};

module.exports = {
  OrderModel,
  OrderService
};
