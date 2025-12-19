const RentPackage = require('../models/RentPackage');
const RentContribution = require('../models/RentContribution');
const User = require('../models/User');

// @desc    Get all rent packages
// @route   GET /api/rent-packages
// @access  Public
const getAllRentPackages = async (req, res) => {
  try {
    const packages = await RentPackage.find({ isActive: true });
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Get single rent package
// @route   GET /api/rent-packages/:id
// @access  Public
const getRentPackageById = async (req, res) => {
  try {
    const pkg = await RentPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: '❌ Rent package not found' });
    res.status(200).json(pkg);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Create rent package
// @route   POST /api/rent-packages
// @access  Private (Admin)
const createRentPackage = async (req, res) => {
  try {
    const { name, description, amount, image } = req.body;
    const newPackage = new RentPackage({ name, description, amount, image });
    const saved = await newPackage.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Update rent package
// @route   PUT /api/rent-packages/:id
// @access  Private (Admin)
const updateRentPackage = async (req, res) => {
  try {
    const { name, description, amount, image, isActive } = req.body;
    const updated = await RentPackage.findByIdAndUpdate(
      req.params.id,
      { name, description, amount, image, isActive },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: '❌ Rent package not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Delete rent package
// @route   DELETE /api/rent-packages/:id
// @access  Private (Admin)
const deleteRentPackage = async (req, res) => {
  try {
    const deleted = await RentPackage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: '❌ Rent package not found' });
    res.status(200).json({ message: '✅ Rent package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Purchase (take) rent package - user pays 20% upfront, remainder credited to withdrawable balance
// @route   POST /api/rent-packages/:id/purchase
// @access  Private
const purchaseRentPackage = async (req, res) => {
  try {
    const packageId = req.params.id;
    const { repaymentMonths } = req.body;
    const userId = req.user.id;

    if (!repaymentMonths || repaymentMonths < 2 || repaymentMonths > 12) {
      return res.status(400).json({ message: '❌ repaymentMonths must be between 2 and 12' });
    }

    const rentPackage = await RentPackage.findById(packageId);
    if (!rentPackage) return res.status(404).json({ message: '❌ Rent package not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: '❌ User not found' });

    const totalAmount = rentPackage.amount;
    const firstPaymentAmount = Math.ceil(totalAmount * 0.2);

    if (user.balances.walletBalance < firstPaymentAmount) {
      return res.status(400).json({
        message: '❌ Insufficient wallet balance for 20% upfront payment',
        requiredAmount: firstPaymentAmount,
        currentBalance: user.balances.walletBalance
      });
    }

    const monthlyPayment = Math.ceil(totalAmount / repaymentMonths);

    const rentContribution = new RentContribution({
      userId,
      packageId,
      repaymentMonths,
      totalAmount,
      paidAmount: firstPaymentAmount,
      remainingAmount: totalAmount - firstPaymentAmount,
      monthlyPayment,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalMonths: repaymentMonths,
      currentMonth: 1
    });

    rentContribution.paymentHistory.push({
      amount: firstPaymentAmount,
      paymentDate: new Date(),
      paymentMethod: 'wallet',
      status: 'completed'
    });

    // Deduct first payment from user's wallet
    user.balances.walletBalance -= firstPaymentAmount;

    // Credit the rest (disbursed amount) to withdrawable balance
    const disbursed = totalAmount - firstPaymentAmount;
    user.balances.withdrawableBalance += disbursed;

    // Add transaction record
    user.transactions.push({
      type: "rent_payment",
      amount: firstPaymentAmount,
      status: "completed",
      description: `Upfront 20% for rent package ${rentPackage.name}`
    });

    user.rentContributions.push({
      contributionId: rentContribution._id,
      packageName: rentPackage.name,
      startDate: new Date(),
      status: 'active'
    });

    await rentContribution.save();
    await user.save();

    await rentContribution.populate('packageId');

    res.status(201).json({
      message: '✅ Rent package taken successfully',
      contribution: rentContribution,
      user: {
        walletBalance: user.balances.walletBalance,
        withdrawableBalance: user.balances.withdrawableBalance
      }
    });

  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Get user's rent contributions
// @route   GET /api/rent-packages/users/:userId/contributions
// @access  Private
const getUserRentContributions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) return res.status(403).json({ message: '❌ Access denied' });

    const contributions = await RentContribution.find({ userId })
      .populate('packageId')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Get rent contribution by ID
// @route   GET /api/rent-packages/contributions/:contributionId
// @access  Private
const getRentContributionById = async (req, res) => {
  try {
    const { contributionId } = req.params;
    const contribution = await RentContribution.findById(contributionId)
      .populate('packageId')
      .populate('userId', 'firstName lastName email phoneNumber');

    if (!contribution) return res.status(404).json({ message: '❌ Rent contribution not found' });
    if (contribution.userId._id.toString() !== req.user.id) return res.status(403).json({ message: '❌ Access denied' });

    res.status(200).json(contribution);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Make payment for rent contribution
// @route   POST /api/rent-packages/payment/:contributionId
// @access  Private
const makeRentPackagePayment = async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;

    const contribution = await RentContribution.findById(contributionId).populate('packageId');
    if (!contribution) return res.status(404).json({ message: '❌ Rent contribution not found' });
    if (contribution.userId.toString() !== userId) return res.status(403).json({ message: '❌ Access denied' });
    if (!contribution.isActive || contribution.isCompleted) return res.status(400).json({ message: '❌ This rent contribution is already completed' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: '❌ User not found' });
    if (user.balances.walletBalance < amount) return res.status(400).json({ message: '❌ Insufficient wallet balance', requiredAmount: amount, currentBalance: user.balances.walletBalance });

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

    user.balances.walletBalance -= amount;
    user.transactions.push({
      type: 'rent_payment',
      amount: amount,
      status: 'completed',
      description: `Monthly payment for ${contribution.packageId.name} rent package`
    });

    if (contribution.isCompleted) {
      const userContribution = user.rentContributions.id(contribution._id);
      if (userContribution) userContribution.status = 'completed';
    }

    await contribution.save();
    await user.save();

    res.status(200).json({ message: '✅ Payment successful', contribution, user: { walletBalance: user.balances.walletBalance } });
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

module.exports = {
  getAllRentPackages,
  getRentPackageById,
  createRentPackage,
  updateRentPackage,
  deleteRentPackage,
  purchaseRentPackage,
  getUserRentContributions,
  getRentContributionById,
  makeRentPackagePayment
};
