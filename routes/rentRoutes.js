const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const activationMiddleware = require('../middlewares/activationMiddleware');
const {
  getAllRentPackages,
  getRentPackageById,
  createRentPackage,
  updateRentPackage,
  deleteRentPackage,
  purchaseRentPackage,
  getUserRentContributions,
  getRentContributionById,
  makeRentPackagePayment
} = require('../controllers/RentPackageController');

// Public
router.get('/', getAllRentPackages);
router.get('/:id', getRentPackageById);

// Protected
router.post('/', createRentPackage);
router.put('/:id', authMiddleware, updateRentPackage);
router.delete('/:id', authMiddleware, deleteRentPackage);
const kycMiddleware = require('../middlewares/kycMiddleware');
router.post('/:id/purchase', authMiddleware, activationMiddleware, kycMiddleware, purchaseRentPackage);
router.get('/users/:userId/contributions', authMiddleware, getUserRentContributions);
router.get('/contributions/:contributionId', authMiddleware, getRentContributionById);
router.post('/payment/:contributionId', authMiddleware, makeRentPackagePayment);

module.exports = router;
