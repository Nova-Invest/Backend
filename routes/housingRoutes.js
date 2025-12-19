// routes/housingRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const activationMiddleware = require('../middlewares/activationMiddleware');
const {
  getAllHousingPackages,
  getHousingPackageById,
  createHousingPackage,
  updateHousingPackage,
  deleteHousingPackage,
  purchaseHousingPackage,
  getUserHousingContributions,
  getHousingContributionById,
  makeHousingPayment
} = require('../controllers/HousingController');

// Public
router.get('/', getAllHousingPackages);
router.get('/:id', getHousingPackageById);

// Admin only
router.post('/', createHousingPackage);
router.put('/:id', authMiddleware, updateHousingPackage);
router.delete('/:id', authMiddleware, deleteHousingPackage);

const kycMiddleware = require('../middlewares/kycMiddleware');
// User actions
router.post('/:id/purchase', authMiddleware, activationMiddleware, kycMiddleware, purchaseHousingPackage);
router.get('/users/:userId/contributions', authMiddleware, getUserHousingContributions);
router.get('/contributions/:contributionId', authMiddleware, getHousingContributionById);
router.post('/payment/:contributionId', authMiddleware, makeHousingPayment);

module.exports = router;