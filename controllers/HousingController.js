// controllers/HousingController.js
const HousingPackage = require('../models/HousingPackage');
const HousingContribution = require('../models/HousingContribution');
const User = require('../models/User');

// @desc    Get all active housing packages
// @route   GET /api/housing
// @access  Public
const getAllHousingPackages = async (req, res) => {
  try {
    const packages = await HousingPackage.find({ isActive: true });
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single housing package
// @route   GET /api/housing/:id
// @access  Public
const getHousingPackageById = async (req, res) => {
  try {
    const pkg = await HousingPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Housing package not found' });
    res.status(200).json(pkg);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create housing package (Admin)
// @route   POST /api/housing
// @access  Private (Admin)
const createHousingPackage = async (req, res) => {
  try {
    const { name, description, price, image } = req.body;
    const pkg = new HousingPackage({ name, description, price, image });
    const saved = await pkg.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update housing package (Admin)
// @route   PUT /api/housing/:id
// @access  Private (Admin)
const updateHousingPackage = async (req, res) => {
  try {
    const updated = await HousingPackage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Housing package not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete housing package (Admin)
// @route   DELETE /api/housing/:id
// @access  Private (Admin)
const deleteHousingPackage = async (req, res) => {
  try {
    const deleted = await HousingPackage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Housing package not found' });
    res.status(200).json({ message: 'Housing package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Purchase housing package
// @route   POST /api/housing/:id/purchase
// @access  Private (Authenticated & Activated)
const purchaseHousingPackage = async (req, res) => {
  try {
    const { repaymentYears, firstPaymentAmount } = req.body;
    const packageId = req.params.id;
    const userId = req.user.id;

    // Validate repayment years
    if (!repaymentYears || repaymentYears < 1 || repaymentYears > 30) {
      return res.status(400).json({ message: 'Repayment period must be 1–30 years' });
    }

    const housingPackage = await HousingPackage.findById(packageId);
    if (!housingPackage) return res.status(404).json({ message: 'Housing package not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.balances.walletBalance < firstPaymentAmount) {
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        required: firstPaymentAmount,
        available: user.balances.walletBalance
      });
    }

    const totalMonths = repaymentYears * 12;
    const monthlyPayment = Math.ceil(housingPackage.price / totalMonths);

    const contribution = new HousingContribution({
      userId,
      packageId,
      repaymentYears,
      totalAmount: housingPackage.price,
      paidAmount: firstPaymentAmount,
      remainingAmount: housingPackage.price - firstPaymentAmount,
      monthlyPayment,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalMonths,
      currentMonth: 1
    });

    contribution.paymentHistory.push({
      amount: firstPaymentAmount,
      paymentDate: new Date(),
      paymentMethod: 'wallet',
      status: 'completed'
    });

    // Deduct from wallet
    user.balances.walletBalance -= firstPaymentAmount;

    // Record transaction
    user.transactions.push({
      type: 'housing_payment',
      amount: firstPaymentAmount,
      status: 'completed',
      description: `First payment for ${housingPackage.name} housing`
    });

    // Track in user profile
    user.housingContributions = user.housingContributions || [];
    user.housingContributions.push({
      contributionId: contribution._id,
      packageName: housingPackage.name,
      startDate: new Date(),
      status: 'active'
    });

    await contribution.save();
    await user.save();
    await contribution.populate('packageId');

    res.status(201).json({
      message: 'Housing package purchased successfully',
      contribution,
      user: { walletBalance: user.balances.walletBalance }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get user's housing contributions
// @route   GET /api/housing/users/:userId/contributions
// @access  Private
const getUserHousingContributions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) return res.status(403).json({ message: 'Access denied' });

    const contributions = await HousingContribution.find({ userId })
      .populate('packageId')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single contribution
// @route   GET /api/housing/contributions/:contributionId
// @access  Private
const getHousingContributionById = async (req, res) => {
  try {
    const contribution = await HousingContribution.findById(req.params.contributionId)
      .populate('packageId')
      .populate('userId', 'firstName lastName email phoneNumber');

    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(contribution);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Make monthly payment
// @route   POST /api/housing/payment/:contributionId
// @access  Private
const makeHousingPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const { contributionId } = req.params;
    const userId = req.user.id;

    const contribution = await HousingContribution.findById(contributionId).populate('packageId');
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.userId.toString() !== userId) return res.status(403).json({ message: 'Access denied' });
    if (!contribution.isActive || contribution.isCompleted) {
      return res.status(400).json({ message: 'This housing plan is already completed' });
    }

    const user = await User.findById(userId);
    if (user.balances.walletBalance < amount) {
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        required: amount,
        available: user.balances.walletBalance
      });
    }

    // Update contribution
    contribution.paidAmount += amount;
    contribution.remainingAmount = contribution.totalAmount - contribution.paidAmount;
    contribution.currentMonth += 1;
    contribution.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (contribution.remainingAmount <= 0) {
      contribution.isCompleted = true;
      contribution.isActive = false;
      contribution.endDate = new Date();
    }

    contribution.paymentHistory.push({
      amount,
      paymentDate: new Date(),
      paymentMethod: 'wallet',
      status: 'completed'
    });

    // Update user
    user.balances.walletBalance -= amount;
    user.transactions.push({
      type: 'housing_payment',
      amount,
      status: 'completed',
      description: `Monthly payment for ${contribution.packageId.name}`
    });

    if (contribution.isCompleted) {
      const userContrib = user.housingContributions.id(contribution._id);
      if (userContrib) userContrib.status = 'completed';
    }

    await contribution.save();
    await user.save();

    res.status(200).json({
      message: 'Payment successful',
      contribution,
      user: { walletBalance: user.balances.walletBalance }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllHousingPackages,
  getHousingPackageById,
  createHousingPackage,
  updateHousingPackage,
  deleteHousingPackage,
  purchaseHousingPackage,
  getUserHousingContributions,
  getHousingContributionById,
  makeHousingPayment
};