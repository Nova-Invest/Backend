const express = require('express');
const { verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

// Verify payment
router.get('/verify', verifyPayment);

module.exports = router;