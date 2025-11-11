const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../utils/sendOTP");
const mongoose = require("mongoose");
require("dotenv").config();

/**
 * @desc Register a new user
 * @route POST /api/users/register
 */
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate JWT token
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Create user
    user = new User({
      firstName,
      lastName,
      phoneNumber,
      email,
      password,
      token, // Save token in user document
    });

    await user.save();
    res
      .status(201)
      .json({ message: "User registered successfully", token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Login user & get token
 * @route POST /api/users/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Update token in database
    user.token = token;
    await user.save();

    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Admin Login & get token
 * @route POST /api/users/admin-login
 */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      username !== process.env.Growvest_Username ||
      password !== process.env.Growvest_Passcode
    ) {
      res.status(500).json({ message: "Invalid Credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get all users
 * @route GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get single user by ID
 * @route GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Update user
 * @route PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic user info
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.phoneNumber) user.phoneNumber = updateData.phoneNumber;
    if (updateData.email) user.email = updateData.email;

    // Update profile (nested fields)
    if (updateData.profile) {
      user.profile = {
        ...user.profile,
        ...updateData.profile,
      };
    }

    // Update bank details (nested fields)
    if (updateData.bankDetails) {
      user.bankDetails = {
        ...user.bankDetails,
        ...updateData.bankDetails,
      };
    }

    // Update next of kin (nested fields)
    if (updateData.nextOfKin) {
      user.nextOfKin = {
        ...user.nextOfKin,
        ...updateData.nextOfKin,
      };
    }

    // Update investment package
    if (updateData.investmentPackage) {
      user.investmentPackage = updateData.investmentPackage;
    }

    // Handle balances update with transaction record
    if (updateData.balances) {
      const balanceChanges = {};
      const originalBalances = { ...user.balances._doc };

      // Check each balance field
      for (const [key, value] of Object.entries(updateData.balances)) {
        if (typeof value === 'number' && value >= 0) {
          balanceChanges[key] = value;
        }
      }

      // Only update if there are valid changes
      if (Object.keys(balanceChanges).length > 0) {
        user.balances = {
          ...user.balances,
          ...balanceChanges,
        };

        // Record balance changes in transactions
        for (const [key, newValue] of Object.entries(balanceChanges)) {
          const oldValue = originalBalances[key] || 0;
          if (newValue !== oldValue) {
            user.transactions.push({
              type: `balance_adjustment_${key}`,
              amount: newValue - oldValue,
              date: new Date(),
              status: "completed",
              description: `Manual ${key} adjustment`,
              reference: `MANUAL-${Date.now()}`,
            });
          }
        }
      }
    }

    // Save the updated user
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          _id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          balances: updatedUser.balances,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map(err => err.message),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate field value entered",
        field: Object.keys(error.keyPattern)[0],
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Delete user
 * @route DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Edit user
 * @route PUT /api/edit-user/:id
 */
const editUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      password,
      email,
      phoneNumber,
      address,
      nin,
      dob,
      bankName,
      accountNumber,
      accountName,
      profileImage,
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.firstName = firstName;
    user.lastName = lastName;
    user.password = hashedPassword || user.password;
    user.email = email;
    user.profile.phoneNumber = phoneNumber;
    user.profile.address = address;
    user.profile.nin = nin;
    user.profile.dob = dob;
    user.bankDetails.accountName = accountName;
    user.bankDetails.accountNumber = accountNumber;
    user.bankDetails.bankName = bankName;
    user.profile.profilePicture = profileImage;

    if (
      user.firstName &&
      user.lastName &&
      user.password &&
      user.email &&
      user.profile &&
      user.profile.phoneNumber &&
      user.profile.address &&
      user.profile.nin &&
      user.profile.dob &&
      user.profile.profilePicture &&
      user.bankDetails &&
      user.bankDetails.accountName &&
      user.bankDetails.accountNumber &&
      user.bankDetails.bankName &&
      user.nextOfKin &&
      user.nextOfKin.fullName &&
      user.nextOfKin.relationship &&
      user.nextOfKin.phoneNumber
    ) {
      user.profileCompleted = true;
    } else {
      user.profileCompleted = false;
    }

    await user.save();
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Add user
 * @route PUT /api/add-user/:id
 */
const addUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      password,
      email,
      phoneNumber,
      address,
      nin,
      dob,
      bankName,
      accountNumber,
      accountName,
      profileImage,
    } = req.body;

    let userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      firstName,
      lastName,
      password: hashedPassword,
      email,
      phoneNumber,
      profile: {
        address,
        nin,
        dob,
        profilePicture: profileImage,
      },
      bankDetails: {
        bankName,
        accountNumber,
        accountName,
      },
    });

    await user.save();
    res.status(201).json({ message: "User Added Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Add Next Of Kin
 * @route PUT /api/add-next-of-kin/:id
 */
const addNextOfKin = async (req, res) => {
  try {
    const { fullName, phoneNumber, relationship } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) return res.status(400).json({ message: "User not found" });

    user.nextOfKin.fullName = fullName;
    user.nextOfKin.phoneNumber = phoneNumber;
    user.nextOfKin.relationship = relationship;

    if (
      user.firstName &&
      user.lastName &&
      user.password &&
      user.email &&
      user.phoneNumber &&
      user.profile &&
      user.profile.address &&
      user.profile.nin &&
      user.profile.dob &&
      user.profile.profilePicture &&
      user.bankDetails &&
      user.bankDetails.accountName &&
      user.bankDetails.accountNumber &&
      user.bankDetails.bankName &&
      user.nextOfKin &&
      user.nextOfKin.fullName &&
      user.nextOfKin.relationship &&
      user.nextOfKin.phoneNumber
    ) {
      user.profileCompleted = true;
    } else {
      user.profileCompleted = false;
    }

    await user.save();

    res.status(201).json({
      message: "Next Of Kin Added Successfully",
      data: {
        fullName,
        phoneNumber,
        relationship,
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Fetch Pending Withdrawals
 * @route GET /api/pending-withdrawals
 */
const pendingWithdrawals = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    let pendingTransactions;

    if (user) {
      pendingTransactions = user.transactions.filter(
        (txn) => txn.status === "pending"
      );
    } else {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(201).json({
      message: "Pending Transactions Successfully Fetched",
      data: {
        pendingTransactions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Generate OTP
 * @route POST /api/get-otp
 */
/**
 * @desc Generate OTP
 * @route POST /api/users/get-otp/:id
 */
const getOTP = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.tempOTP = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTP(user.email, otp);

    res.status(200).json({ 
      message: "OTP sent successfully",
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

const confirmOTP = async (req, res) => {
  try {
    const userId = req.params.id;
    const { otp } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.tempOTP) {
      return res.status(400).json({ message: "No OTP requested" });
    }

    if (new Date() > user.otpExpiry) {
      user.tempOTP = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.tempOTP !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    user.tempOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ 
      message: "OTP verified",
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
/**
 * @desc Activate user account for 1 year (deduct 5000 Naira from wallet)
 * @route POST /api/users/activate/:id
 */
const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isActivated) return res.status(400).json({ message: "User already activated" });

    if (user.balances.walletBalance < 5000) {
      return res.status(400).json({ message: "Insufficient wallet balance for activation" });
    }

    // Deduct fee
    user.balances.walletBalance -= 5000;

    // Activate user
    user.isActivated = true;
    user.activationDate = new Date();
    const expiration = new Date(user.activationDate);
    expiration.setFullYear(expiration.getFullYear() + 1);
    user.activationExpiration = expiration;

    // Record transaction (amount negative for deduction)
    user.transactions.push({
      type: "activation_fee",
      amount: -5000,
      date: new Date(),
      status: "completed",
      description: "Account activation fee for 1 year",
      reference: `ACT-${Date.now()}`,
    });

    await user.save();

    res.status(200).json({
      message: "User activated successfully for 1 year",
      user: {
        _id: user._id,
        isActivated: user.isActivated,
        activationDate: user.activationDate,
        activationExpiration: user.activationExpiration,
        balances: user.balances,
      },
    });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  editUser,
  addUser,
  adminLogin,
  addNextOfKin,
  pendingWithdrawals,
  getOTP,
  confirmOTP,
  activateUser,
};
