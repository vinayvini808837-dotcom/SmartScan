const { ComplaintService } = require('../models/Complaint');

const STATE_CONTROLLERS = {
  'Gujarat': {
    controller: 'Controller of Legal Metrology, Sector-10B, Gandhinagar - 382010',
    email: 'clm-gujarat@nic.in',
    helpline: '079-23253500',
    code: 'GJ'
  },
  'Karnataka': {
    controller: 'Controller of Legal Metrology, Ali Asker Road, Bengaluru - 560052',
    email: 'clm-ka@nic.in',
    helpline: '080-22262444',
    code: 'KA'
  },
  'Maharashtra': {
    controller: 'Controller of Legal Metrology, Barrack No. 7, Free Church Compound, Mumbai - 400021',
    email: 'clm-mh@nic.in',
    helpline: '022-22886666',
    code: 'MH'
  },
  'Delhi': {
    controller: 'Controller of Legal Metrology, C-Block, Vikas Bhawan, I.P. Estate, New Delhi - 110002',
    email: 'clm-delhi@nic.in',
    helpline: '011-23379200',
    code: 'DL'
  },
  'Tamil Nadu': {
    controller: 'Controller of Legal Metrology, DMS Campus, Teynampet, Chennai - 600006',
    email: 'clm-tn@nic.in',
    helpline: '044-24330111',
    code: 'TN'
  },
  'Uttar Pradesh': {
    controller: 'Controller of Legal Metrology, 4-A, Rana Pratap Marg, Lucknow - 226001',
    email: 'clm-up@nic.in',
    helpline: '0522-2287123',
    code: 'UP'
  },
  'West Bengal': {
    controller: 'Controller of Legal Metrology, 45, Ganesh Chandra Avenue, Kolkata - 700013',
    email: 'clm-wb@nic.in',
    helpline: '033-22361000',
    code: 'WB'
  },
  'Telangana': {
    controller: 'Controller of Legal Metrology, PWD Building, Khairatabad, Hyderabad - 500004',
    email: 'clm-tg@nic.in',
    helpline: '040-23390888',
    code: 'TG'
  }
};

function getStateMeta(state) {
  return STATE_CONTROLLERS[state] || {
    controller: `Controller of Legal Metrology, State Head Office, ${state}`,
    email: `clm-${(state || 'india').toLowerCase().replace(/\s+/g, '')}@nic.in`,
    helpline: '1915 (National Consumer Helpline)',
    code: (state || 'IN').slice(0, 2).toUpperCase()
  };
}

// POST /api/complaints
async function createComplaint(req, res) {
  try {
    const {
      inspectionId,
      barcode,
      productName,
      brand,
      category,
      mrp,
      netQuantity,
      state = 'Gujarat',
      district = 'District HQ',
      storeName = 'Retail Store',
      violationsSummary,
      violatedRules,
      evidenceImage,
      complainantName,
      complainantPhone,
      complainantEmail
    } = req.body;

    if (!productName || !violationsSummary) {
      return res.status(400).json({
        success: false,
        message: 'Product name and violations summary are mandatory for filing a statutory complaint.'
      });
    }

    const stateMeta = getStateMeta(state);
    const trackingId = req.body.trackingId || `LM-COMP-2026-${stateMeta.code}-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaintRecord = await ComplaintService.create({
      trackingId,
      inspectionId: inspectionId || 'LM-INSP-MANUAL',
      barcode: barcode || '',
      productName,
      brand: brand || 'Packaged Commodity Brand',
      category: category || 'Packaged Commodity',
      mrp: mrp || '',
      netQuantity: netQuantity || '',
      state,
      district,
      storeName,
      violationsSummary,
      violatedRules: Array.isArray(violatedRules) ? violatedRules : [violationsSummary],
      evidenceImage: evidenceImage || '',
      complainantName: complainantName || 'Consumer / Verification Officer',
      complainantPhone: complainantPhone || '',
      complainantEmail: complainantEmail || '',
      assignedOfficer: `Enforcement Division (${stateMeta.code}) - ${stateMeta.controller}`,
      status: 'UNDER_INVESTIGATION'
    });

    res.status(201).json({
      success: true,
      message: `Statutory complaint registered and transmitted to the ${state} Controller of Legal Metrology.`,
      data: {
        trackingId: complaintRecord.trackingId,
        jurisdiction: stateMeta,
        statutorySection: 'Section 36(1) of Legal Metrology Act, 2009 (Act No. 1 of 2010)',
        complaint: complaintRecord
      }
    });
  } catch (err) {
    console.error('Error creating complaint:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/complaints
async function getComplaints(req, res) {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;
    if (req.query.status) filter.status = req.query.status;

    const complaints = await ComplaintService.find(filter);
    res.json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/complaints/:trackingId
async function getComplaintByTrackingId(req, res) {
  try {
    const complaint = await ComplaintService.findByTrackingId(req.params.trackingId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }
    const stateMeta = getStateMeta(complaint.state);
    res.json({
      success: true,
      data: complaint,
      jurisdiction: stateMeta
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/complaints/:trackingId/status
async function updateComplaintStatus(req, res) {
  try {
    const { status, notes } = req.body;
    const complaint = await ComplaintService.updateStatus(req.params.trackingId, status, notes);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }
    res.json({
      success: true,
      message: 'Complaint status updated.',
      data: complaint
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintByTrackingId,
  updateComplaintStatus
};
