const InvestmentPackage = require("../models/InvestmentPackage");
const User = require("../models/User");

// @desc    Get all investment packages
// @route   GET /api/investment-packages
// @access  Public
const getAllInvestmentPackages = async (req, res) => {
  try {
    const packages = await InvestmentPackage.find().populate(
      "users.userId",
      "name email"
    );
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Get a single investment package by ID
// @route   GET /api/investment-packages/:id
// @access  Public
const getInvestmentPackageById = async (req, res) => {
  try {
    const package = await InvestmentPackage.findById(req.params.id).populate(
      "users.userId",
      "name email"
    );
    if (!package) {
      return res
        .status(404)
        .json({ message: "❌ Investment package not found" });
    }
    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Create a new investment package
// @route   POST /api/investment-packages
// @access  Private (Admin)
const createInvestmentPackage = async (req, res) => {
  try {
    const { name, duration, interestRate, investmentAmount } = req.body;
    const newPackage = new InvestmentPackage({
      name,
      duration,
      interestRate,
      investmentAmount,
    });
    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Update an investment package
// @route   PUT /api/investment-packages/:id
// @access  Private (Admin)
const updateInvestmentPackage = async (req, res) => {
  try {
    const { name, duration, interestRate, investmentAmount } = req.body;
    const updatedPackage = await InvestmentPackage.findByIdAndUpdate(
      req.params.id,
      { name, duration, interestRate, investmentAmount },
      { new: true }
    );
    if (!updatedPackage) {
      return res
        .status(404)
        .json({ message: "❌ Investment package not found" });
    }
    res.status(200).json(updatedPackage);
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Delete an investment package
// @route   DELETE /api/investment-packages/:id
// @access  Private (Admin)
const deleteInvestmentPackage = async (req, res) => {
  try {
    const deletedPackage = await InvestmentPackage.findByIdAndDelete(
      req.params.id
    );
    if (!deletedPackage) {
      return res
        .status(404)
        .json({ message: "❌ Investment package not found" });
    }
    res
      .status(200)
      .json({ message: "✅ Investment package deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

// @desc    Register a user to an investment package
// @route   POST /api/investment-packages/:id/register
// @access  Private
const registerUserToPackage = async (req, res) => {
  try {
    const { id } = req.params; // Investment package ID
    const { amountInvested, userId } = req.body; // Amount invested by the user and user ID

    // Fetch the investment package
    const investmentPackage = await InvestmentPackage.findById(id);
    if (!investmentPackage) {
      return res
        .status(404)
        .json({ message: "❌ Investment package not found" });
    }

    // Check users profile if completed
    const user = await User.findById(userId);
    // if (!user.profileCompleted) {
    //   return res
    //     .status(404)
    //     .json({ message: "❌ You Must Complete Profile First" });
    // }

    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // Check if the user has sufficient wallet balance
    if (user.balances.walletBalance < amountInvested) {
      return res
        .status(400)
        .json({ message: "❌ Insufficient wallet balance" });
    }

    // Deduct the amount from wallet balance and add to invested balance
    user.balances.walletBalance -= amountInvested;
    user.balances.investedBalance += amountInvested;

    // Calculate 20% of the invested amount and add to withdrawable balance
    const roi = amountInvested * (investmentPackage.interestRate / 100);
    user.balances.withdrawableBalance += roi;

    // Add the investment to the user's investmentPackage array
    user.investmentPackage.push({
      name: investmentPackage.name,
      startDate: new Date(),
      maturityDate: new Date(
        new Date().setMonth(new Date().getMonth() + investmentPackage.duration)
      ),
      amountInvested,
      interestRate: investmentPackage.interestRate,
      duration: `${investmentPackage.duration} months`,
    });

    // Add the transaction to the user's transaction history
    user.transactions.push({
      type: "investment",
      amount: amountInvested,
      status: "completed",
    });

    // Save the updated user
    await user.save();

    // Add the user to the investment package's users array
    investmentPackage.users.push({
      userId,
      amountInvested: amountInvested, // Fix typo here (should be amountInvested)
    });
    await investmentPackage.save();

    res.status(200).json({ message: "✅ Investment successful", user });
  } catch (error) {
    res.status(500).json({ message: "❌ Server Error", error: error.message });
  }
};

module.exports = {
  getAllInvestmentPackages,
  getInvestmentPackageById,
  createInvestmentPackage,
  updateInvestmentPackage,
  deleteInvestmentPackage,
  registerUserToPackage,
};
