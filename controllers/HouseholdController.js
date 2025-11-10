// controllers/HouseholdController.js
const HouseholdBundle = require('../models/HouseholdBundle');
const HouseholdContribution = require('../models/HouseholdContribution');
const User = require('../models/User');

// ---------- Bundles ----------
const getAllHouseholdBundles = async (req, res) => {
  try {
    const bundles = await HouseholdBundle.find({ isActive: true });
    res.json(bundles);
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

const getHouseholdBundleById = async (req, res) => {
  try {
    const bundle = await HouseholdBundle.findById(req.params.id);
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.json(bundle);
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

// Admin creates full bundle at once
const createHouseholdBundle = async (req, res) => {
  try {
    const { name, description, items, totalPrice, image } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Bundle must contain at least one item' });
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
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
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
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

const deleteHouseholdBundle = async (req, res) => {
  try {
    const del = await HouseholdBundle.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: 'Bundle not found' });
    res.json({ message: 'Bundle deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

// ---------- Purchase ----------
const purchaseHouseholdBundle = async (req, res) => {
  try {
    const { repaymentMonths, firstPaymentAmount } = req.body;
    const bundleId = req.params.id;
    const userId = req.user.id;

    const bundle = await HouseholdBundle.findById(bundleId);
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.balances.walletBalance < firstPaymentAmount)
      return res.status(400).json({ message: 'Insufficient wallet balance' });

    const monthly = Math.ceil(bundle.totalPrice / repaymentMonths);

    const contrib = new HouseholdContribution({
      userId,
      bundleId,
      repaymentMonths,
      totalAmount: bundle.totalPrice,
      paidAmount: firstPaymentAmount,
      remainingAmount: bundle.totalPrice - firstPaymentAmount,
      monthlyPayment: monthly,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalMonths: repaymentMonths,
      currentMonth: 1
    });

    contrib.paymentHistory.push({
      amount: firstPaymentAmount,
      paymentMethod: 'wallet',
      status: 'completed'
    });

    user.balances.walletBalance -= firstPaymentAmount;
    user.transactions.push({
      type: 'household_bundle_payment',
      amount: firstPaymentAmount,
      status: 'completed',
      description: `First payment – ${bundle.name} bundle`
    });

    user.householdContributions = user.householdContributions || [];
    user.householdContributions.push({
      contributionId: contrib._id,
      bundleName: bundle.name,
      startDate: new Date(),
      status: 'active'
    });

    await contrib.save();
    await user.save();
    await contrib.populate('bundleId');

    res.status(201).json({
      message: 'Household bundle purchased successfully',
      contribution: contrib,
      walletBalance: user.balances.walletBalance
    });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

// ---------- Contributions ----------
const getUserHouseholdContributions = async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) return res.status(403).json({ message: 'Access denied' });
    const contribs = await HouseholdContribution.find({ userId: req.params.userId })
      .populate('bundleId')
      .sort({ createdAt: -1 });
    res.json(contribs);
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

const getHouseholdContributionById = async (req, res) => {
  try {
    const contrib = await HouseholdContribution.findById(req.params.contributionId)
      .populate('bundleId')
      .populate('userId', 'firstName lastName email phoneNumber');
    if (!contrib) return res.status(404).json({ message: 'Contribution not found' });
    if (contrib.userId._id.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });
    res.json(contrib);
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

// ---------- Payment ----------
const makeHouseholdPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const contribId = req.params.contributionId;
    const userId = req.user.id;

    const contrib = await HouseholdContribution.findById(contribId).populate('bundleId');
    if (!contrib) return res.status(404).json({ message: 'Contribution not found' });
    if (contrib.userId.toString() !== userId) return res.status(403).json({ message: 'Access denied' });
    if (!contrib.isActive || contrib.isCompleted) return res.status(400).json({ message: 'Contribution already completed' });

    const user = await User.findById(userId);
    if (user.balances.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    contrib.paidAmount += amount;
    contrib.remainingAmount = contrib.totalAmount - contrib.paidAmount;
    contrib.currentMonth += 1;
    contrib.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (contrib.remainingAmount <= 0) {
      contrib.isCompleted = true;
      contrib.isActive = false;
      contrib.endDate = new Date();
    }

    contrib.paymentHistory.push({ amount, paymentMethod: 'wallet', status: 'completed' });

    user.balances.walletBalance -= amount;
    user.transactions.push({
      type: 'household_bundle_payment',
      amount,
      status: 'completed',
      description: `Monthly payment – ${contrib.bundleId.name}`
    });

    if (contrib.isCompleted) {
      const uc = user.householdContributions.id(contrib._id);
      if (uc) uc.status = 'completed';
    }

    await contrib.save();
    await user.save();

    res.json({
      message: 'Payment successful',
      contribution: contrib,
      walletBalance: user.balances.walletBalance
    });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
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