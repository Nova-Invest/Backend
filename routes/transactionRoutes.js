const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getAllTransactions, getTransactionById } = require('../controllers/transactionController');

// Admin: list all transactions with filters and pagination
router.get('/', authMiddleware, getAllTransactions);

// Admin or owner: get single transaction
router.get('/:transactionId', authMiddleware, getTransactionById);

module.exports = router;
