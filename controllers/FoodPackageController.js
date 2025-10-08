const FoodPackage = require('../models/FoodPackage');
const FoodContribution = require('../models/FoodContribution');
const User = require('../models/User');

// @desc    Get all food packages
// @route   GET /api/food-packages
// @access  Public
const getAllFoodPackages = async (req, res) => {
  try {
    const packages = await FoodPackage.find({ isActive: true });
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Get single food package
// @route   GET /api/food-packages/:id
// @access  Public
const getFoodPackageById = async (req, res) => {
  try {
    const package = await FoodPackage.findById(req.params.id);
    if (!package) {
      return res.status(404).json({ message: '❌ Food package not found' });
    }
    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Create food package
// @route   POST /api/food-packages
// @access  Private (Admin)
const createFoodPackage = async (req, res) => {
  try {
    const { name, description, fixedPrice, foodItems, image, category } = req.body;

    const newPackage = new FoodPackage({
      name,
      description,
      fixedPrice,
      foodItems,
      image,
      category
    });

    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Update food package
// @route   PUT /api/food-packages/:id
// @access  Private (Admin)
const updateFoodPackage = async (req, res) => {
  try {
    const { name, description, fixedPrice, foodItems, image, category, isActive } = req.body;

    const updatedPackage = await FoodPackage.findByIdAndUpdate(
      req.params.id,
      { name, description, fixedPrice, foodItems, image, category, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: '❌ Food package not found' });
    }

    res.status(200).json(updatedPackage);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Delete food package
// @route   DELETE /api/food-packages/:id
// @access  Private (Admin)
const deleteFoodPackage = async (req, res) => {
  try {
    const deletedPackage = await FoodPackage.findByIdAndDelete(req.params.id);
    if (!deletedPackage) {
      return res.status(404).json({ message: '❌ Food package not found' });
    }
    res.status(200).json({ message: '✅ Food package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Purchase food package
// @route   POST /api/food-packages/:id/purchase
// @access  Private
const purchaseFoodPackage = async (req, res) => {
  try {
    const { selectedItems, repaymentMonths, firstPaymentAmount } = req.body;
    const packageId = req.params.id;
    const userId = req.user.id;

    // Fetch food package
    const foodPackage = await FoodPackage.findById(packageId);
    if (!foodPackage) {
      return res.status(404).json({ message: '❌ Food package not found' });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    // Check if user has sufficient wallet balance for first payment
    if (user.balances.walletBalance < firstPaymentAmount) {
      return res.status(400).json({ 
        message: '❌ Insufficient wallet balance for first payment',
        requiredAmount: firstPaymentAmount,
        currentBalance: user.balances.walletBalance
      });
    }

    // Calculate monthly payment
    const monthlyPayment = Math.ceil(foodPackage.fixedPrice / repaymentMonths);

    // Create food contribution
    const foodContribution = new FoodContribution({
      userId,
      packageId,
      selectedItems,
      repaymentMonths,
      totalAmount: foodPackage.fixedPrice,
      paidAmount: firstPaymentAmount,
      remainingAmount: foodPackage.fixedPrice - firstPaymentAmount,
      monthlyPayment,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      totalMonths: repaymentMonths,
      currentMonth: 1
    });

    // Add first payment to payment history
    foodContribution.paymentHistory.push({
      amount: firstPaymentAmount,
      paymentDate: new Date(),
      paymentMethod: 'wallet',
      status: 'completed'
    });

    // Deduct first payment from user's wallet
    user.balances.walletBalance -= firstPaymentAmount;

    // Add transaction record
    user.transactions.push({
      type: "food_package_payment",
      amount: firstPaymentAmount,
      status: "completed",
      description: `First payment for ${foodPackage.name} food package`
    });

    // Add to user's food contributions
    user.foodContributions.push({
      contributionId: foodContribution._id,
      packageName: foodPackage.name,
      startDate: new Date(),
      status: 'active'
    });

    // Save all changes
    await foodContribution.save();
    await user.save();

    // Populate the response with package details
    await foodContribution.populate('packageId');

    res.status(201).json({
      message: '✅ Food package purchased successfully',
      contribution: foodContribution,
      user: {
        walletBalance: user.balances.walletBalance
      }
    });

  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message }, console.log(error.message));
  }
};

// @desc    Get user's food contributions
// @route   GET /api/food-packages/users/:userId/contributions
// @access  Private
const getUserFoodContributions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the requesting user can only access their own contributions
    if (req.user.id !== userId) {
      return res.status(403).json({ message: '❌ Access denied' });
    }

    const contributions = await FoodContribution.find({ userId })
      .populate('packageId')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Get food contribution by ID
// @route   GET /api/food-packages/contributions/:contributionId
// @access  Private
const getFoodContributionById = async (req, res) => {
  try {
    const { contributionId } = req.params;

    const contribution = await FoodContribution.findById(contributionId)
      .populate('packageId')
      .populate('userId', 'firstName lastName email phoneNumber');

    if (!contribution) {
      return res.status(404).json({ message: '❌ Food contribution not found' });
    }

    // Verify the requesting user can only access their own contribution
    if (contribution.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: '❌ Access denied' });
    }

    res.status(200).json(contribution);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Make payment for food package
// @route   POST /api/food-packages/payment/:contributionId
// @access  Privates
const makeFoodPackagePayment = async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;

    // Fetch contribution
    const contribution = await FoodContribution.findById(contributionId)
      .populate('packageId');
    
    if (!contribution) {
      return res.status(404).json({ message: '❌ Food contribution is not found' });
    }

    // Verify ownership
    if (contribution.userId.toString() !== userId) {
      return res.status(403).json({ message: '❌ Access denied' });
    }

    // Check if contribution is still active
    if (!contribution.isActive || contribution.isCompleted) {
      return res.status(400).json({ message: '❌ This food contribution is already completed' });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    // Check if user has sufficient wallet balance
    if (user.balances.walletBalance < amount) {
      return res.status(400).json({ 
        message: '❌ Insufficient wallet balance',
        requiredAmount: amount,
        currentBalance: user.balances.walletBalance
      });
    }

    // Update contribution
    contribution.paidAmount += amount;
    contribution.remainingAmount = contribution.totalAmount - contribution.paidAmount;
    contribution.currentMonth += 1;

    // Update next payment date (30 days from now)
    contribution.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Check if contribution is completed
    if (contribution.remainingAmount <= 0) {
      contribution.isCompleted = true;
      contribution.isActive = false;
      contribution.endDate = new Date();
    }

    // Add payment to history
    contribution.paymentHistory.push({
      amount: amount,
      paymentDate: new Date(),
      paymentMethod: 'wallet',
      status: 'completed'
    });

    // Update user wallet and transactions
    user.balances.walletBalance -= amount;
    user.transactions.push({
      type: "food_package_payment",
      amount: amount,
      status: "completed",
      description: `Monthly payment for ${contribution.packageId.name} food package`
    });

    // Update user's food contribution status if completed
    if (contribution.isCompleted) {
      const userContribution = user.foodContributions.id(contribution._id);
      if (userContribution) {
        userContribution.status = 'completed';
      }
    }

    // Save all changes
    await contribution.save();
    await user.save();

    res.status(200).json({
      message: '✅ Payment successful',
      contribution: contribution,
      user: {
        walletBalance: user.balances.walletBalance
      }
    });

  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

module.exports = {
  getAllFoodPackages,
  getFoodPackageById,
  createFoodPackage,
  updateFoodPackage,
  deleteFoodPackage,
  purchaseFoodPackage,
  getUserFoodContributions,
  getFoodContributionById,
  makeFoodPackagePayment
};