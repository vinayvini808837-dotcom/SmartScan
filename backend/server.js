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
const complaintRoutes = require('./routes/complaintRoutes');
const { ComplaintService } = require('./models/Complaint');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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
app.use('/api/complaints', complaintRoutes);

// Health Check & Diagnostics
app.get('/api/health', async (req, res) => {
  const products = await ProductService.find();
  const complaints = await ComplaintService.find();
  res.json({
    status: 'ONLINE',
    service: 'ComplyScan Express REST API',
    version: '2.0.0',
    database: {
      mode: getDbMode(),
      connected: isMongoDBConnected(),
      productsLoaded: products.length,
      complaintsRecorded: complaints.length
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

  // Seed Initial Complaints
  await ComplaintService.seedInitialComplaints([
    {
      trackingId: 'LM-COMP-2026-GJ-4102',
      inspectionId: 'LM-INSP-GJ-9021',
      barcode: '8906073783326',
      productName: 'DOMS Mathematical Compass Box (Defective Sample)',
      brand: 'DOMS Industries Limited',
      category: 'Stationery & Mathematical Instruments',
      mrp: '₹85.00',
      netQuantity: '1 Kit',
      state: 'Gujarat',
      district: 'Valsad',
      storeName: 'Sardar Stationery Mart, Umbergaon',
      violationsSummary: 'Rule 6(1)(f): Missing Consumer Care Cell Helpline/Email; Rule 6(1)(e): Missing Unit Sale Price.',
      violatedRules: ['Rule 6(1)(f)', 'Rule 6(1)(e)'],
      complainantName: 'Legal Metrology Inspector, Valsad Zone',
      assignedOfficer: 'Controller of Legal Metrology, Gandhinagar, Gujarat',
      status: 'UNDER_INVESTIGATION',
      filedDate: '2026-09-18'
    },
    {
      trackingId: 'LM-COMP-2026-MH-2084',
      inspectionId: 'LM-INSP-MH-1120',
      barcode: '8901499026416',
      productName: 'Everest Shahi Garam Masala Pouch',
      brand: 'Everest Food Products Pvt Ltd',
      category: 'Spices & Seasoning',
      mrp: '₹85.00',
      netQuantity: '100 g',
      state: 'Maharashtra',
      district: 'Mumbai City',
      storeName: 'Kalyan General Stores, Tardeo',
      violationsSummary: 'Rule 6(1)(f): Missing Mandatory Consumer Care Helpline; Rule 6(1)(e): Missing Unit Sale Price.',
      violatedRules: ['Rule 6(1)(f)', 'Rule 6(1)(e)'],
      complainantName: 'District Enforcement Officer, Mumbai',
      assignedOfficer: 'Controller of Legal Metrology, Mumbai, Maharashtra',
      status: 'NOTICE_ISSUED',
      filedDate: '2026-09-17'
    }
  ]);

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ComplyScan Node.js Express REST API Server`);
    console.log(`   API Base:    http://localhost:${PORT}/api`);
    console.log(`   Health:      http://localhost:${PORT}/api/health`);
    console.log(`   Products:    http://localhost:${PORT}/api/products`);
    console.log(`   Complaints:  http://localhost:${PORT}/api/complaints`);
    console.log(`   Database:    ${getDbMode().toUpperCase()}`);
    console.log(`======================================================\n`);
  });
}

start();
