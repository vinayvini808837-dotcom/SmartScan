require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getDbMode, isMongoDBConnected } = require('./config/db');
const { ProductService } = require('./models/Product');
const SEED_PRODUCTS = require('./seeds/seedProducts');

const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const ocrRoutes = require('./routes/ocrRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static frontend files from ../frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ocr', ocrRoutes);

// Health Check & Diagnostics
app.get('/api/health', async (req, res) => {
  const products = await ProductService.find();
  res.json({
    status: 'ONLINE',
    service: 'SmartScan Express REST API',
    version: '1.0.0',
    database: {
      mode: getDbMode(),
      connected: isMongoDBConnected(),
      productsLoaded: products.length
    },
    uptime: Math.round(process.uptime()) + 's',
    timestamp: new Date().toISOString()
  });
});

// Clean URL routing fallback for HTML pages
app.get('/:page', (req, res, next) => {
  const filePath = path.join(FRONTEND_DIR, req.params.page + '.html');
  res.sendFile(filePath, (err) => {
    if (err) next();
  });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Start Server
async function start() {
  // Connect to Database
  await connectDB();

  // Seed Catalog
  await ProductService.seedIfEmpty(SEED_PRODUCTS);

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SmartScan Node.js Express REST API Server`);
    console.log(`   API Base:   http://localhost:${PORT}/api`);
    console.log(`   Health:     http://localhost:${PORT}/api/health`);
    console.log(`   Products:   http://localhost:${PORT}/api/products`);
    console.log(`   Database:   ${getDbMode().toUpperCase()}`);
    console.log(`======================================================\n`);
  });
}

start();
