const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isConnected = false;
let dbMode = 'uninitialized';

// In-memory fallback store
const fallbackStore = {
  products: [],
  cart: {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    updatedAt: new Date()
  },
  orders: []
};

const DATA_FILE = path.join(__dirname, '..', 'data', 'fallback_data.json');

// Ensure data folder exists
function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load persisted fallback data if available
function loadPersistedData() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data.products && Array.isArray(data.products)) fallbackStore.products = data.products;
      if (data.cart) fallbackStore.cart = data.cart;
      if (data.orders && Array.isArray(data.orders)) fallbackStore.orders = data.orders;
      console.log('📦 Loaded persisted store data from disk.');
    }
  } catch (err) {
    console.warn('⚠️ Could not load fallback data file:', err.message);
  }
}

// Save fallback data to disk
function persistData() {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallbackStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Could not save fallback data file:', err.message);
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartscan';
  
  try {
    console.log(`🔌 Attempting connection to MongoDB at: ${uri}`);
    // Connect with short timeout so server starts fast if local mongod is absent
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500
    });
    isConnected = true;
    dbMode = 'mongodb';
    console.log('✅ MongoDB connected successfully via Mongoose.');
  } catch (err) {
    isConnected = false;
    dbMode = 'memory_fallback';
    console.log('⚠️ MongoDB is not active on this system.');
    console.log('🚀 SmartScan is running in RESILIENT FALLBACK MODE (In-memory + File storage).');
    console.log('ℹ️ All Product scanning, Barcode lookup, Cart, and Order flows will operate seamlessly!');
    loadPersistedData();
  }
}

module.exports = {
  connectDB,
  isMongoDBConnected: () => isConnected,
  getDbMode: () => dbMode,
  fallbackStore,
  persistData
};
