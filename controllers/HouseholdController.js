// controllers/householdController.js
const HouseholdBundle = require('../models/HouseholdBundle');
const HouseholdContribution = require('../models/HouseholdContribution');
const User = require('../models/User');

// Get all active bundles
const getAllHouseholdBundles = async (req, res) => {
  try {
    const bundles = await HouseholdBundle.find({ isActive: true })
      .select('-__v')
      .sort({ createdAt: -1 });
    res.status(200).json(bundles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getHouseholdBundleById = async (req, res) => {
  try {
    const bundle = await HouseholdBundle.findById(req.params.id);
    if (!bundle || !bundle.isActive) {
      return res.status(404).json({ message: 'Household bundle not found or inactive' });
    }
    res.status(200).json(bundle);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Admin Only
const createHouseholdBundle = async (req, res) => {
  try {
    const { name, description, items, totalPrice, image } = req.body;

    if (!name || !items || !Array.isArray(items) || items.length === 0 || !totalPrice) {
      return res.status(400).json({ message: 'Name, items, and totalPrice are required' });
    }

    const bundle = new HouseholdBundle({
      name,
      description,
      items,
      totalPrice,
      image
    });

    const saved = await bundle.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const updateHouseholdBundle = async (req, res) => {
  try {
    const updated = await HouseholdBundle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Bundle not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const deleteHouseholdBundle = async (req, res) => {
  try {
    const bundle = await HouseholdBundle.findByIdAndDelete(req.params.id);
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.status(200).json({ message: 'Household bundle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Purchase Bundle
const purchaseHouseholdBundle = async (req, res) => {
  try {
    const { repaymentMonths, firstPaymentAmount } = req.body;
    const bundleId = req.params.id;
    const userId = req.user.id;

    if (!repaymentMonths || repaymentMonths < 1 || repaymentMonths > 6) {
      return res.status(400).json({ message: 'Repayment must be between 1 and 6 months' });
    }

    const bundle = await HouseholdBundle.findById(bundleId);
    if (!bundle || !bundle.isActive) {
      return res.status(404).json({ message: 'Bundle not found or inactive' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.balances.walletBalance < firstPaymentAmount) {
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        required: firstPaymentAmount,
        available: user.balances.walletBalance
      });
    }

    const monthlyPayment = Math.ceil(bundle.totalPrice / repaymentMonths);

    const contribution = new HouseholdContribution({
      userId,
      bundleId,
      repaymentMonths,
      totalAmount: bundle.totalPrice,
      paidAmount: firstPaymentAmount,
      remainingAmount: bundle.totalPrice - firstPaymentAmount,
      monthlyPayment,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalMonths: repaymentMonths,
      currentMonth: 1
    });

    contribution.paymentHistory.push({
      amount: firstPaymentAmount,
      paymentMethod: 'wallet',
      status: 'completed'
    });

    user.balances.walletBalance -= firstPaymentAmount;
    user.transactions.push({
      type: 'household_bundle_payment',
      amount: firstPaymentAmount,
      status: 'completed',
      description: `First payment – ${bundle.name} household bundle`
    });

    if (!user.householdContributions) user.householdContributions = [];
    user.householdContributions.push({
      contributionId: contribution._id,
      bundleName: bundle.name,
      startDate: new Date(),
      status: 'active'
    });

    await contribution.save();
    await user.save();
    await contribution.populate('bundleId');

    res.status(201).json({
      message: 'Household bundle purchased successfully',
      contribution,
      walletBalance: user.balances.walletBalance
    });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get user's contributions
const getUserHouseholdContributions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) return res.status(403).json({ message: 'Access denied' });

    const contributions = await HouseholdContribution.find({ userId })
      .populate('bundleId', 'name totalPrice image items')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getHouseholdContributionById = async (req, res) => {
  try {
    const contribution = await HouseholdContribution.findById(req.params.contributionId)
      .populate('bundleId')
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

// Make payment
const makeHouseholdPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const { contributionId } = req.params;
    const userId = req.user.id;

    const contribution = await HouseholdContribution.findById(contributionId)
      .populate('bundleId');
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.userId.toString() !== userId) return res.status(403).json({ message: 'Access denied' });
    if (!contribution.isActive || contribution.isCompleted) {
      return res.status(400).json({ message: 'This contribution is already completed' });
    }

    const user = await User.findById(userId);
    if (user.balances.walletBalance < amount) {
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        required: amount,
        available: user.balances.walletBalance
      });
    }

    contribution.paidAmount += amount;
    contribution.currentMonth += 1;
    contribution.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    contribution.paymentHistory.push({
      amount,
      paymentMethod: 'wallet',
      status: 'completed'
    });

    user.balances.walletBalance -= amount;
    user.transactions.push({
      type: 'household_bundle_payment',
      amount,
      status: 'completed',
      description: `Monthly payment – ${contribution.bundleId.name} bundle`
    });

    if (contribution.remainingAmount <= amount) {
      contribution.isCompleted = true;
      contribution.isActive = false;
      contribution.endDate = new Date();

      const userContrib = user.householdContributions.find(
        c => c.contributionId.toString() === contributionId
      );
      if (userContrib) userContrib.status = 'completed';
    }

    await contribution.save();
    await user.save();

    res.status(200).json({
      message: 'Payment successful',
      contribution,
      walletBalance: user.balances.walletBalance
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllHouseholdBundles,
  getHouseholdBundleById,
  createHouseholdBundle,
  updateHouseholdBundle,
  deleteHouseholdBundle,
  purchaseHouseholdBundle,
  getUserHouseholdContributions,
  getHouseholdContributionById,
  makeHouseholdPayment
};