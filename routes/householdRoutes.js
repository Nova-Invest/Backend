// routes/householdRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const activationMiddleware = require('../middlewares/activationMiddleware');
const {
  getAllHouseholdBundles,
  getHouseholdBundleById,
  createHouseholdBundle,
  updateHouseholdBundle,
  deleteHouseholdBundle,
  purchaseHouseholdBundle,
  getUserHouseholdContributions,
  getHouseholdContributionById,
  makeHouseholdPayment
} = require('../controllers/HouseholdController');

// Bundles (Public + Admin)
router.get('/', getAllHouseholdBundles);
router.get('/:id', getHouseholdBundleById);
router.post('/', createHouseholdBundle);           // Admin only
router.put('/:id', updateHouseholdBundle);
router.delete('/:id', deleteHouseholdBundle);

// Purchase & Contributions
router.post('/:id/purchase', authMiddleware, activationMiddleware, purchaseHouseholdBundle);
router.get('/users/:userId/contributions', authMiddleware, getUserHouseholdContributions);
router.get('/contributions/:contributionId', authMiddleware, getHouseholdContributionById);
router.post('/payment/:contributionId', authMiddleware, makeHouseholdPayment);

module.exports = router;