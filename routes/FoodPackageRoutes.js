const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const activationMiddleware = require('../middlewares/activationMiddleware')
const {
  getAllFoodPackages,
  getFoodPackageById,
  createFoodPackage,
  updateFoodPackage,
  deleteFoodPackage,
  purchaseFoodPackage,
  getUserFoodContributions,
  getFoodContributionById,
  makeFoodPackagePayment
} = require('../controllers/FoodPackageController');

// Public routes
router.get('/', getAllFoodPackages);
router.get('/:id', getFoodPackageById);

// Protected routes
router.post('/',  createFoodPackage);
router.put('/:id', authMiddleware, updateFoodPackage);
router.delete('/:id', authMiddleware, deleteFoodPackage);
router.post('/:id/purchase',activationMiddleware, authMiddleware, purchaseFoodPackage);
router.get('/users/:userId/contributions', authMiddleware, getUserFoodContributions);
router.get('/contributions/:contributionId', authMiddleware, getFoodContributionById);
router.post('/payment/:contributionId', authMiddleware, makeFoodPackagePayment);

module.exports = router;