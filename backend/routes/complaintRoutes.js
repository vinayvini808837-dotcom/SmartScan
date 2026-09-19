const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getComplaintByTrackingId,
  updateComplaintStatus
} = require('../controllers/complaintController');

router.post('/', createComplaint);
router.get('/', getComplaints);
router.get('/:trackingId', getComplaintByTrackingId);
router.patch('/:trackingId/status', updateComplaintStatus);

module.exports = router;
