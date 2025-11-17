// controllers/housingController.js
const HousingPackage = require('../models/HousingPackage');
const HousingContribution = require('../models/HousingContribution');
const User = require('../models/User');

// Get all active housing packages
const getAllHousingPackages = async (req, res) => {
  try {
    const packages = await HousingPackage.find({ isActive: true }).select('-__v');
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getHousingPackageById = async (req, res) => {
  try {
    const pkg = await HousingPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Housing package not found' });
    res.status(200).json(pkg);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Admin routes
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

const deleteHousingPackage = async (req, res) => {
  try {
    const deleted = await HousingPackage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Housing package not found' });
    res.status(200).json({ message: 'Housing package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Purchase housing package
const purchaseHousingPackage = async (req, res) => {
  try {
    const { repaymentYears, firstPaymentAmount } = req.body;
    const packageId = req.params.id;
    const userId = req.user.id;

    if (!repaymentYears || repaymentYears < 1 || repaymentYears > 30) {
      return res.status(400).json({ message: 'Repayment period must be between 1 and 30 years' });
    }

    const housingPackage = await HousingPackage.findById(packageId);
    if (!housingPackage || !housingPackage.isActive) {
      return res.status(404).json({ message: 'Housing package not found or inactive' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.balances.walletBalance < firstPaymentAmount) {
      return res.status(400).json({
        message: 'Insufficient wallet balance for first payment',
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

    user.balances.walletBalance -= firstPaymentAmount;

    user.transactions.push({
      type: "housing_payment",
      amount: firstPaymentAmount,
      status: "completed",
      description: `First payment for ${housingPackage.name} housing package`
    });

    // Ensure array exists
    if (!user.housingContributions) user.housingContributions = [];

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
      walletBalance: user.balances.walletBalance
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getUserHousingContributions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) return res.status(403).json({ message: 'Access denied' });

    const contributions = await HousingContribution.find({ userId })
      .populate('packageId', 'name price image description')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

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

const makeHousingPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const { contributionId } = req.params;
    const userId = req.user.id;

    const contribution = await HousingContribution.findById(contributionId).populate('packageId');
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.userId.toString() !== userId) return res.status(403).json({ message: 'Access denied' });
    if (!contribution.isActive || contribution.isCompleted) {
      return res.status(400).json({ message: 'This housing contribution is already completed or inactive' });
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
      paymentDate: new Date(),
      paymentMethod: 'wallet',
      status: 'completed'
    });

    user.balances.walletBalance -= amount;
    user.transactions.push({
      type: 'housing_payment',
      amount,
      status: 'completed',
      description: `Monthly payment for ${contribution.packageId.name} housing`
    });

    if (contribution.remainingAmount <= amount) {
      contribution.isCompleted = true;
      contribution.isActive = false;
      contribution.endDate = new Date();

      const userContrib = user.housingContributions.find(
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