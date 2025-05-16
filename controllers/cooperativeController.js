const CooperativePackage = require("../models/CooperativePackage");
const User = require("../models/User");

// @desc    Get all cooperative packages
// @route   GET /api/cooperative-packages
// @access  Public
const getAllCooperativePackages = async (req, res) => {
  try {
    const packages = await CooperativePackage.find({ isActive: true }).populate(
      "members.userId",
      "firstName lastName email"
    );
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Get a single cooperative package by ID
// @route   GET /api/cooperative-packages/:id
// @access  Public
const getCooperativePackageById = async (req, res) => {
  try {
    const package = await CooperativePackage.findById(req.params.id).populate(
      "members.userId",
      "firstName lastName email"
    );
    if (!package) {
      return res.status(404).json({ message: "❌ Cooperative package not found" });
    }
    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Create a new cooperative package (Admin only)
// @route   POST /api/cooperative-packages
// @access  Private (Admin)
const createCooperativePackage = async (req, res) => {
  try {
    const { name, description, targetAmount, duration, contributionFrequency } = req.body;
    
    // Calculate contribution amount based on frequency
    let contributionAmount;
    if (contributionFrequency === 'monthly') {
      contributionAmount = targetAmount / duration;
    } else if (contributionFrequency === 'weekly') {
      contributionAmount = targetAmount / (duration * 4);
    } else { // bi-weekly
      contributionAmount = targetAmount / (duration * 2);
    }
    
    const newPackage = new CooperativePackage({
      name,
      description,
      targetAmount,
      duration,
      contributionAmount,
      contributionFrequency,
      createdBy: req.user.id,
      currentAmount: 0,
    });
    
    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Update a cooperative package (Admin only)
// @route   PUT /api/cooperative-packages/:id
// @access  Private (Admin)
const updateCooperativePackage = async (req, res) => {
  try {
    const { name, description, targetAmount, duration, isActive, contributionFrequency } = req.body;
    
    const updateData = { name, description, isActive, contributionFrequency };
    
    // Recalculate contribution amount if target, duration or frequency changes
    if (targetAmount && duration && contributionFrequency) {
      updateData.targetAmount = targetAmount;
      updateData.duration = duration;
      
      if (contributionFrequency === 'monthly') {
        updateData.contributionAmount = targetAmount / duration;
      } else if (contributionFrequency === 'weekly') {
        updateData.contributionAmount = targetAmount / (duration * 4);
      } else { // bi-weekly
        updateData.contributionAmount = targetAmount / (duration * 2);
      }
    }
    
    const updatedPackage = await CooperativePackage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedPackage) {
      return res.status(404).json({ message: "❌ Cooperative package not found" });
    }
    res.status(200).json(updatedPackage);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Delete a cooperative package (Admin only)
// @route   DELETE /api/cooperative-packages/:id
// @access  Private (Admin)
const deleteCooperativePackage = async (req, res) => {
  try {
    const deletedPackage = await CooperativePackage.findByIdAndDelete(
      req.params.id
    );
    
    if (!deletedPackage) {
      return res.status(404).json({ message: "❌ Cooperative package not found" });
    }
    
    // Remove package references from users
    await User.updateMany(
      { "cooperativeMemberships.packageId": req.params.id },
      { $pull: { cooperativeMemberships: { packageId: req.params.id } } }
    );
    
    res.status(200).json({ message: "✅ Cooperative package deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Join a cooperative package
// @route   POST /api/cooperative-packages/:id/join
// @access  Private
const joinCooperativePackage = async (req, res) => {
  try {
    const packageId = req.params.id;
    const userId = req.user.id;
    
    // Check if package exists and is active
    const cooperativePackage = await CooperativePackage.findById(packageId);
    if (!cooperativePackage || !cooperativePackage.isActive) {
      return res.status(404).json({ message: "❌ Cooperative package not available" });
    }
    
    // Check if user already joined
    const existingMember = cooperativePackage.members.find(
      member => member.userId.toString() === userId
    );
    
    if (existingMember) {
      return res.status(400).json({ message: "❌ You have already joined this package" });
    }
    
    // Check user's profile completion
    const user = await User.findById(userId);
    if (!user.profileCompleted) {
      return res.status(400).json({ message: "❌ Please complete your profile first" });
    }
    
    // Calculate next payment date based on frequency
    const nextPaymentDate = new Date();
    if (cooperativePackage.contributionFrequency === 'monthly') {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else if (cooperativePackage.contributionFrequency === 'weekly') {
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
    } else { // bi-weekly
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 14);
    }
    
    // Add user to package members
    cooperativePackage.members.push({
      userId,
      nextPaymentDate,
      isActive: true,
      paymentsMade: 0,
      amountPaid: 0,
    });
    
    // Add package to user's memberships
    user.cooperativeMemberships.push({
      packageId,
      packageName: cooperativePackage.name,
      nextPaymentDate,
      isActive: true,
      totalAmount: cooperativePackage.targetAmount,
      paidAmount: 0,
      contributionAmount: cooperativePackage.contributionAmount,
      contributionFrequency: cooperativePackage.contributionFrequency,
      startDate: new Date(),
      endDate: new Date(),
    });
    
    // Calculate end date based on duration
    user.cooperativeMemberships[user.cooperativeMemberships.length - 1].endDate.setMonth(
      user.cooperativeMemberships[user.cooperativeMemberships.length - 1].startDate.getMonth() + cooperativePackage.duration
    );
    
    // Save changes
    await cooperativePackage.save();
    await user.save();
    
    res.status(200).json({ 
      message: "✅ Successfully joined cooperative package",
      package: cooperativePackage
    });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Get user's cooperative contributions
// @route   GET /api/users/:userId/cooperative-contributions
// @access  Private
const getUserContributions = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('cooperativeMemberships')
      .populate('cooperativeMemberships.packageId', 'name description');
    
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }
    
    res.status(200).json(user.cooperativeMemberships);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Get specific cooperative contribution details
// @route   GET /api/users/:userId/cooperative-contributions/:packageId
// @access  Private
const getContributionDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const package = await CooperativePackage.findById(req.params.packageId);
    
    if (!user || !package) {
      return res.status(404).json({ message: "❌ User or package not found" });
    }
    
    const contribution = user.cooperativeMemberships.find(
      m => m.packageId.toString() === req.params.packageId
    );
    
    if (!contribution) {
      return res.status(404).json({ message: "❌ Contribution not found" });
    }
    
    res.status(200).json({
      package,
      contribution
    });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Get payment history for a cooperative package
// @route   GET /api/cooperative-packages/:packageId/payments
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.id,
      'transactions.packageId': req.params.packageId
    }).select('transactions');
    
    if (!user) {
      return res.status(404).json({ message: "❌ No payment history found" });
    }
    
    const payments = user.transactions.filter(
      t => t.packageId?.toString() === req.params.packageId && t.type === 'cooperative_payment'
    );
    
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Make monthly cooperative payment
// @route   POST /api/cooperative-packages/:id/pay
// @access  Private
const makeCooperativePayment = async (req, res) => {
  try {
    const packageId = req.params.id;
    const userId = req.user.id;
    const { amount } = req.body;
    
    // Get package and user
    const cooperativePackage = await CooperativePackage.findById(packageId);
    const user = await User.findById(userId);
    
    if (!cooperativePackage) {
      return res.status(404).json({ message: "❌ Cooperative package not found" });
    }
    
    // Check if user is a member
    const packageMembership = user.cooperativeMemberships.find(
      m => m.packageId.toString() === packageId && m.isActive
    );
    
    if (!packageMembership) {
      return res.status(400).json({ message: "❌ You are not an active member of this package" });
    }
    
    // Check if payment is due
    if (new Date() < new Date(packageMembership.nextPaymentDate)) {
      return res.status(400).json({ message: "❌ Your next payment is not due yet" });
    }
    
    // Check if amount matches expected contribution
    if (amount !== cooperativePackage.contributionAmount) {
      return res.status(400).json({ 
        message: `❌ Payment amount must be ₦${cooperativePackage.contributionAmount}`
      });
    }
    
    // Check user's wallet balance
    if (user.balances.walletBalance < amount) {
      return res.status(400).json({ message: "❌ Insufficient wallet balance" });
    }
    
    // Deduct from wallet
    user.balances.walletBalance -= amount;
    
    // Update package current amount
    cooperativePackage.currentAmount += amount;
    
    // Update payment info in user's membership
    packageMembership.paymentsMade += 1;
    packageMembership.paidAmount += amount;
    packageMembership.lastPaymentDate = new Date();
    
    // Calculate next payment date based on frequency
    packageMembership.nextPaymentDate = new Date();
    if (packageMembership.contributionFrequency === 'monthly') {
      packageMembership.nextPaymentDate.setMonth(packageMembership.nextPaymentDate.getMonth() + 1);
    } else if (packageMembership.contributionFrequency === 'weekly') {
      packageMembership.nextPaymentDate.setDate(packageMembership.nextPaymentDate.getDate() + 7);
    } else { // bi-weekly
      packageMembership.nextPaymentDate.setDate(packageMembership.nextPaymentDate.getDate() + 14);
    }
    
    // Update payment info in package's member list
    const packageMember = cooperativePackage.members.find(
      m => m.userId.toString() === userId
    );
    
    if (packageMember) {
      packageMember.paymentsMade += 1;
      packageMember.amountPaid += amount;
      packageMember.lastPaymentDate = new Date();
      packageMember.nextPaymentDate = new Date(packageMembership.nextPaymentDate);
    }
    
    // Add transaction record
    const transaction = {
      type: "cooperative_payment",
      amount: amount,
      status: "completed",
      description: `Payment for ${cooperativePackage.name}`,
      packageId: cooperativePackage._id,
      packageName: cooperativePackage.name,
      date: new Date()
    };
    
    user.transactions.push(transaction);
    
    // Save changes
    await cooperativePackage.save();
    await user.save();
    
    res.status(200).json({ 
      message: "✅ Payment successful",
      transaction,
      nextPaymentDate: packageMembership.nextPaymentDate
    });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Leave a cooperative package
// @route   POST /api/cooperative-packages/:id/leave
// @access  Private
const leaveCooperativePackage = async (req, res) => {
  try {
    const packageId = req.params.id;
    const userId = req.user.id;
    
    // Get package and user
    const cooperativePackage = await CooperativePackage.findById(packageId);
    const user = await User.findById(userId);
    
    if (!cooperativePackage) {
      return res.status(404).json({ message: "❌ Cooperative package not found" });
    }
    
    // Check if user is a member
    const packageMembershipIndex = user.cooperativeMemberships.findIndex(
      m => m.packageId.toString() === packageId && m.isActive
    );
    
    if (packageMembershipIndex === -1) {
      return res.status(400).json({ message: "❌ You are not an active member of this package" });
    }
    
    // Mark as inactive in user's memberships
    user.cooperativeMemberships[packageMembershipIndex].isActive = false;
    user.cooperativeMemberships[packageMembershipIndex].endDate = new Date();
    
    // Mark as inactive in package's member list
    const packageMemberIndex = cooperativePackage.members.findIndex(
      m => m.userId.toString() === userId
    );
    
    if (packageMemberIndex !== -1) {
      cooperativePackage.members[packageMemberIndex].isActive = false;
    }
    
    // Save changes
    await cooperativePackage.save();
    await user.save();
    
    res.status(200).json({ message: "✅ Successfully left cooperative package" });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

module.exports = {
  getAllCooperativePackages,
  getCooperativePackageById,
  createCooperativePackage,
  updateCooperativePackage,
  deleteCooperativePackage,
  joinCooperativePackage,
  makeCooperativePayment,
  leaveCooperativePackage,
  getUserContributions,
  getContributionDetails,
  getPaymentHistory,
};