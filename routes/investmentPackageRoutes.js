const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const activationMiddleware = require('../middlewares/activationMiddleware')
const {
  createInvestmentPackage,
  getAllInvestmentPackages,
  getInvestmentPackageById,
  updateInvestmentPackage,
  deleteInvestmentPackage,
  registerUserToPackage,
} = require('../controllers/investmentPackageController');

// Public routes
router.get('/', getAllInvestmentPackages);
router.get('/:id', getInvestmentPackageById);

// Protected routes
router.post('/', authMiddleware, createInvestmentPackage);
router.put('/:id', authMiddleware, updateInvestmentPackage);
router.delete('/:id', authMiddleware, deleteInvestmentPackage);
router.post('/:id/register',activationMiddleware, authMiddleware, registerUserToPackage);

module.exports = router;