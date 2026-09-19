const mongoose = require('mongoose');
const { isMongoDBConnected, fallbackStore, persistData } = require('../config/db');

if (!fallbackStore.complaints) {
  fallbackStore.complaints = [];
}

const ComplaintSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  inspectionId: {
    type: String,
    default: 'LM-INSP-MANUAL'
  },
  barcode: {
    type: String,
    default: ''
  },
  productName: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: 'Retailer/Brand'
  },
  category: {
    type: String,
    default: 'Packaged Commodity'
  },
  mrp: {
    type: String,
    default: ''
  },
  netQuantity: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    required: true,
    default: 'Gujarat'
  },
  district: {
    type: String,
    default: 'District HQ'
  },
  storeName: {
    type: String,
    default: 'Retail Store'
  },
  violationsSummary: {
    type: String,
    required: true
  },
  violatedRules: {
    type: [String],
    default: []
  },
  evidenceImage: {
    type: String,
    default: ''
  },
  complainantName: {
    type: String,
    default: 'Consumer / Inspector'
  },
  complainantPhone: {
    type: String,
    default: ''
  },
  complainantEmail: {
    type: String,
    default: ''
  },
  assignedOfficer: {
    type: String,
    default: 'Enforcement Officer, Legal Metrology Division'
  },
  status: {
    type: String,
    enum: ['REGISTERED', 'UNDER_INVESTIGATION', 'NOTICE_ISSUED', 'COMPOUNDED', 'RESOLVED'],
    default: 'UNDER_INVESTIGATION'
  },
  filedDate: {
    type: String,
    default: () => new Date().toISOString().slice(0, 10)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongoComplaint = mongoose.model('Complaint', ComplaintSchema);

const ComplaintService = {
  async create(complaintData) {
    if (isMongoDBConnected()) {
      const complaint = new MongoComplaint(complaintData);
      return await complaint.save();
    } else {
      const newComplaint = {
        _id: 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...complaintData,
        createdAt: new Date()
      };
      fallbackStore.complaints.unshift(newComplaint);
      persistData();
      return newComplaint;
    }
  },

  async find(filter = {}) {
    if (isMongoDBConnected()) {
      return await MongoComplaint.find(filter).sort({ createdAt: -1 });
    } else {
      let results = [...(fallbackStore.complaints || [])];
      if (filter.state) {
        results = results.filter(c => c.state.toLowerCase() === filter.state.toLowerCase());
      }
      if (filter.status) {
        results = results.filter(c => c.status === filter.status);
      }
      return results;
    }
  },

  async findByTrackingId(trackingId) {
    if (isMongoDBConnected()) {
      return await MongoComplaint.findOne({ trackingId });
    } else {
      return (fallbackStore.complaints || []).find(c => c.trackingId === trackingId) || null;
    }
  },

  async updateStatus(trackingId, status, notes = '') {
    if (isMongoDBConnected()) {
      return await MongoComplaint.findOneAndUpdate(
        { trackingId },
        { $set: { status, statusNotes: notes, updatedAt: new Date() } },
        { new: true }
      );
    } else {
      const complaint = (fallbackStore.complaints || []).find(c => c.trackingId === trackingId);
      if (complaint) {
        complaint.status = status;
        complaint.statusNotes = notes;
        complaint.updatedAt = new Date();
        persistData();
      }
      return complaint;
    }
  },

  async seedInitialComplaints(initialComplaints = []) {
    if (isMongoDBConnected()) {
      const count = await MongoComplaint.countDocuments();
      if (count === 0 && initialComplaints.length > 0) {
        await MongoComplaint.insertMany(initialComplaints);
      }
    } else {
      if (!fallbackStore.complaints || fallbackStore.complaints.length === 0) {
        fallbackStore.complaints = initialComplaints.map(c => ({
          _id: 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          ...c,
          createdAt: new Date()
        }));
        persistData();
      }
    }
  }
};

module.exports = {
  MongoComplaint,
  ComplaintService
};
