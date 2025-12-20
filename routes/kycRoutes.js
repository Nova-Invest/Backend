const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  submitKYC,
  getMyKYC,
  getAllKYCSubmissions,
  verifyKYC,
  rejectKYC
} = require('../controllers/kycController');

// User submits KYC and views their KYC
router.post('/submit', authMiddleware, submitKYC);
router.get('/me', authMiddleware, getMyKYC);

// Admin routes
router.get('/submissions', getAllKYCSubmissions);
router.put('/:userId/verify', verifyKYC);
router.put('/:userId/reject', rejectKYC);

module.exports = router;
