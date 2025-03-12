const InvestmentPackage = require('../models/InvestmentPackage');

// @desc    Get all investment packages
// @route   GET /api/investment-packages
// @access  Public
const getAllInvestmentPackages = async (req, res) => {
  try {
    const packages = await InvestmentPackage.find().populate('users.userId', 'name email');
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Get a single investment package by ID
// @route   GET /api/investment-packages/:id
// @access  Public
const getInvestmentPackageById = async (req, res) => {
  try {
    const package = await InvestmentPackage.findById(req.params.id).populate('users.userId', 'name email');
    if (!package) {
      return res.status(404).json({ message: '❌ Investment package not found' });
    }
    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
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
    res.status(500).json({ message: '❌ Server Error', error: error.message });
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
      return res.status(404).json({ message: '❌ Investment package not found' });
    }
    res.status(200).json(updatedPackage);
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Delete an investment package
// @route   DELETE /api/investment-packages/:id
// @access  Private (Admin)
const deleteInvestmentPackage = async (req, res) => {
  try {
    const deletedPackage = await InvestmentPackage.findByIdAndDelete(req.params.id);
    if (!deletedPackage) {
      return res.status(404).json({ message: '❌ Investment package not found' });
    }
    res.status(200).json({ message: '✅ Investment package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
  }
};

// @desc    Register a user to an investment package
// @route   POST /api/investment-packages/:id/register
// @access  Private
const registerUserToPackage = async (req, res) => {
  try {
    const { id } = req.params; // Investment package ID
    const { amountInvested } = req.body; // Amount invested by the user
    const userId = req.user._id; // User ID from the authenticated user

    // Check if the investment package exists
    const investmentPackage = await InvestmentPackage.findById(id);
    if (!investmentPackage) {
      return res.status(404).json({ message: '❌ Investment package not found' });
    }

    // Add the user to the users array
    investmentPackage.users.push({
      userId,
      amountInvested,
    });
    await investmentPackage.save();

    res.status(200).json({ message: '✅ User registered successfully', investmentPackage });
  } catch (error) {
    res.status(500).json({ message: '❌ Server Error', error: error.message });
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