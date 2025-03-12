const express = require('express');
const { initializePayment, verifyPayment } = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware'); // Import your auth middleware

const router = express.Router();

router.post('/initialize', authMiddleware, initializePayment); // Protect this route
router.get('/verify', verifyPayment);

module.exports = router;