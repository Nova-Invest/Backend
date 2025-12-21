const mongoose = require('mongoose');
const User = require('../models/User');

// @desc Get all transactions (platform-wide)
// @route GET /api/transactions
// @access Private (Admin only)
const getAllTransactions = async (req, res) => {
  try {
    // Admin check: admin token contains username per existing adminLogin
    if (!req.user || !req.user.username) {
      return res.status(403).json({ message: '❌ Admin access required' });
    }

    const {
      page = 1,
      limit = 25,
      type,
      status,
      userId,
      startDate,
      endDate,
      sort = '-date'
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 25, 200);
    const skip = (pageNum - 1) * limitNum;

    const matchConditions = [];

    if (type) matchConditions.push({ type });
    if (status) matchConditions.push({ status });
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.$gte = new Date(startDate);
      if (endDate) range.$lte = new Date(endDate);
      matchConditions.push({ date: range });
    }
    if (userId) {
      // filter by owner userId
      matchConditions.push({ userId: mongoose.Types.ObjectId(userId) });
    }

    const pipeline = [
      { $unwind: '$transactions' },
      {
        $project: {
          transaction: '$transactions',
          userId: '$_id',
          email: '$email',
          firstName: '$firstName',
          lastName: '$lastName'
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$transaction',
              { userId: '$userId', email: '$email', firstName: '$firstName', lastName: '$lastName' }
            ]
          }
        }
      }
    ];

    if (matchConditions.length > 0) pipeline.push({ $match: { $and: matchConditions } });

    // Facet for pagination
    pipeline.push(
      { $sort: parseSort(sort) },
      {
        $facet: {
          results: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }]
        }
      }
    );

    const agg = await User.aggregate(pipeline).allowDiskUse(true);
    const results = (agg[0] && agg[0].results) || [];
    const totalCount = (agg[0] && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;

    res.status(200).json({ page: pageNum, limit: limitNum, total: totalCount, results });
  } catch (error) {
    console.error('getAllTransactions error', error);
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// Helper to parse sort string like '-date' or 'date'
function parseSort(sortStr) {
  if (!sortStr) return { date: -1 };
  const s = String(sortStr).trim();
  if (s.startsWith('-')) return { [s.substring(1)]: -1 };
  return { [s]: 1 };
}

// @desc Get a single transaction by its id
// @route GET /api/transactions/:transactionId
// @access Private (Admin or owner)
const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ message: '❌ Invalid transaction id' });
    }

    // Find the user that owns this transaction and project the matched subdocument
    const user = await User.findOne(
      { 'transactions._id': mongoose.Types.ObjectId(transactionId) },
      { 'transactions.$': 1, firstName: 1, lastName: 1, email: 1 }
    );

    if (!user) return res.status(404).json({ message: '❌ Transaction not found' });

    const transaction = user.transactions && user.transactions[0];

    // Authorization: admin or owner
    const isAdmin = req.user && req.user.username;
    const isOwner = req.user && req.user.id && user._id.toString() === req.user.id;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: '❌ Access denied' });

    // attach owner info
    const result = {
      ...transaction.toObject(),
      owner: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('getTransactionById error', error);
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

module.exports = { getAllTransactions, getTransactionById };
