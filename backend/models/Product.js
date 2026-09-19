const mongoose = require('mongoose');
const { isMongoDBConnected, fallbackStore, persistData } = require('../config/db');

const ProductSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Packaged Commodity'
  },
  mrp: {
    type: Number,
    required: true
  },
  unitPrice: {
    type: String,
    default: ''
  },
  netQuantity: {
    type: String,
    required: true
  },
  mfgDate: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: String,
    default: ''
  },
  batchNumber: {
    type: String,
    default: 'B1'
  },
  manufacturer: {
    type: String,
    default: ''
  },
  countryOfOrigin: {
    type: String,
    default: 'India'
  },
  consumerCare: {
    type: String,
    default: ''
  },
  isCompliant: {
    type: Boolean,
    default: true
  },
  complianceScore: {
    type: Number,
    default: 100
  },
  violationsCount: {
    type: Number,
    default: 0
  },
  violations: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    default: ''
  },
  stock: {
    type: Number,
    default: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ProductModel = mongoose.model('Product', ProductSchema);

// Unified Data Access Layer (Mongoose or Fallback Store)
const ProductService = {
  async find(query = {}) {
    if (isMongoDBConnected()) {
      return await ProductModel.find(query);
    }
    let items = [...fallbackStore.products];
    if (query.category) {
      items = items.filter(p => p.category.toLowerCase() === query.category.toLowerCase());
    }
    if (query.isCompliant !== undefined) {
      items = items.filter(p => p.isCompliant === query.isCompliant);
    }
    return items;
  },

  async findByBarcode(barcode) {
    if (isMongoDBConnected()) {
      return await ProductModel.findOne({ barcode: barcode.trim() });
    }
    return fallbackStore.products.find(p => p.barcode === barcode.trim()) || null;
  },

  async findById(id) {
    if (isMongoDBConnected()) {
      return await ProductModel.findById(id);
    }
    return fallbackStore.products.find(p => (p._id && p._id.toString() === id) || p.id === id || p.barcode === id) || null;
  },

  async search(term) {
    const q = term.toLowerCase().trim();
    if (isMongoDBConnected()) {
      return await ProductModel.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } },
          { barcode: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } }
        ]
      });
    }
    return fallbackStore.products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  },

  async create(data) {
    if (isMongoDBConnected()) {
      return await ProductModel.create(data);
    }
    const newProduct = {
      _id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      id: 'prod_' + Date.now(),
      createdAt: new Date(),
      stock: 50,
      isCompliant: true,
      complianceScore: 100,
      violationsCount: 0,
      violations: [],
      ...data
    };
    fallbackStore.products.unshift(newProduct);
    persistData();
    return newProduct;
  },

  async seedIfEmpty(seedList) {
    if (isMongoDBConnected()) {
      for (const item of seedList) {
        const exists = await ProductModel.findOne({ barcode: item.barcode });
        if (!exists) {
          await ProductModel.create(item);
        }
      }
      console.log(`✅ Seed catalog synchronized with MongoDB (${seedList.length} total seeds).`);
    } else {
      if (!fallbackStore.products) fallbackStore.products = [];
      let added = 0;
      for (const item of seedList) {
        const exists = fallbackStore.products.some(p => p.barcode === item.barcode);
        if (!exists) {
          fallbackStore.products.push({
            ...item,
            _id: 'seed_' + (fallbackStore.products.length + 1),
            id: 'seed_' + (fallbackStore.products.length + 1),
            createdAt: new Date()
          });
          added++;
        }
      }
      if (added > 0) {
        persistData();
        console.log(`✅ Synchronized ${added} new products into fallback store (Total: ${fallbackStore.products.length}).`);
      }
    }
  }
};

module.exports = {
  ProductModel,
  ProductService
};
