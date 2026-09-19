const mongoose = require('mongoose');
const { isMongoDBConnected, fallbackStore, persistData } = require('../config/db');

const CartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  barcode: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  subtotal: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  isCompliant: {
    type: Boolean,
    default: true
  }
});

const CartSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'guest_user'
  },
  items: [CartItemSchema],
  subtotal: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const CartModel = mongoose.model('Cart', CartSchema);

function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST standard for packaged food / FMCG
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

const CartService = {
  async getCart(userId = 'guest_user') {
    if (isMongoDBConnected()) {
      let cart = await CartModel.findOne({ userId });
      if (!cart) {
        cart = await CartModel.create({ userId, items: [] });
      }
      return cart;
    }
    return fallbackStore.cart;
  },

  async addItem(product, quantity = 1, userId = 'guest_user') {
    const qty = parseInt(quantity, 10) || 1;
    
    if (isMongoDBConnected()) {
      let cart = await CartModel.findOne({ userId });
      if (!cart) {
        cart = new CartModel({ userId, items: [] });
      }

      const existingIndex = cart.items.findIndex(
        i => i.barcode === product.barcode || i.productId === (product._id ? product._id.toString() : product.id)
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += qty;
        cart.items[existingIndex].subtotal = cart.items[existingIndex].price * cart.items[existingIndex].quantity;
      } else {
        cart.items.push({
          productId: product._id ? product._id.toString() : product.id,
          barcode: product.barcode,
          name: product.name,
          brand: product.brand || '',
          price: product.mrp || product.price,
          quantity: qty,
          subtotal: (product.mrp || product.price) * qty,
          image: product.image || '',
          isCompliant: product.isCompliant !== false
        });
      }

      const { subtotal, tax, total } = calculateTotals(cart.items);
      cart.subtotal = subtotal;
      cart.tax = tax;
      cart.total = total;
      cart.updatedAt = new Date();
      await cart.save();
      return cart;
    }

    // Fallback store
    const existing = fallbackStore.cart.items.find(
      i => i.barcode === product.barcode || i.productId === (product._id ? product._id.toString() : product.id)
    );

    if (existing) {
      existing.quantity += qty;
      existing.subtotal = existing.price * existing.quantity;
    } else {
      fallbackStore.cart.items.push({
        _id: 'item_' + Date.now(),
        productId: product._id ? product._id.toString() : product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand || '',
        price: product.mrp || product.price,
        quantity: qty,
        subtotal: (product.mrp || product.price) * qty,
        image: product.image || '',
        isCompliant: product.isCompliant !== false
      });
    }

    const totals = calculateTotals(fallbackStore.cart.items);
    fallbackStore.cart.subtotal = totals.subtotal;
    fallbackStore.cart.tax = totals.tax;
    fallbackStore.cart.total = totals.total;
    fallbackStore.cart.updatedAt = new Date();
    persistData();
    return fallbackStore.cart;
  },

  async updateQuantity(barcodeOrId, quantity, userId = 'guest_user') {
    const qty = parseInt(quantity, 10);
    
    if (isMongoDBConnected()) {
      const cart = await CartModel.findOne({ userId });
      if (!cart) return null;

      if (qty <= 0) {
        cart.items = cart.items.filter(i => i.barcode !== barcodeOrId && i._id.toString() !== barcodeOrId);
      } else {
        const item = cart.items.find(i => i.barcode === barcodeOrId || i._id.toString() !== barcodeOrId);
        if (item) {
          item.quantity = qty;
          item.subtotal = item.price * qty;
        }
      }

      const totals = calculateTotals(cart.items);
      cart.subtotal = totals.subtotal;
      cart.tax = totals.tax;
      cart.total = totals.total;
      cart.updatedAt = new Date();
      await cart.save();
      return cart;
    }

    // Fallback store
    if (qty <= 0) {
      fallbackStore.cart.items = fallbackStore.cart.items.filter(i => i.barcode !== barcodeOrId && i._id !== barcodeOrId);
    } else {
      const item = fallbackStore.cart.items.find(i => i.barcode === barcodeOrId || i._id === barcodeOrId);
      if (item) {
        item.quantity = qty;
        item.subtotal = item.price * qty;
      }
    }

    const totals = calculateTotals(fallbackStore.cart.items);
    fallbackStore.cart.subtotal = totals.subtotal;
    fallbackStore.cart.tax = totals.tax;
    fallbackStore.cart.total = totals.total;
    fallbackStore.cart.updatedAt = new Date();
    persistData();
    return fallbackStore.cart;
  },

  async removeItem(barcodeOrId, userId = 'guest_user') {
    return await this.updateQuantity(barcodeOrId, 0, userId);
  },

  async clearCart(userId = 'guest_user') {
    if (isMongoDBConnected()) {
      const cart = await CartModel.findOne({ userId });
      if (cart) {
        cart.items = [];
        cart.subtotal = 0;
        cart.tax = 0;
        cart.total = 0;
        cart.updatedAt = new Date();
        await cart.save();
        return cart;
      }
    }
    fallbackStore.cart = {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      updatedAt: new Date()
    };
    persistData();
    return fallbackStore.cart;
  }
};

module.exports = {
  CartModel,
  CartService
};
