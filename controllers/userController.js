const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../utils/sendOTP");
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
      password: hashedPassword,
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
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      profile,
      bankDetails,
      nextOfKin,
      investmentPackage,
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;

    // Update the profile, including address
    user.profile.address = profile.address || user.profile.address;
    user.profile.nin = profile.nin || user.profile.nin;
    user.profile.dob = profile.dob || user.profile.dob;
    user.profile.profilePicture =
      profile.profilePicture || user.profile.profilePicture;

    // Update bank details
    user.bankDetails = bankDetails || user.bankDetails;

    // Update other fields
    user.nextOfKin = nextOfKin || user.nextOfKin;
    user.investmentPackage = investmentPackage || user.investmentPackage;

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
const generateOTP = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = await sendOTP(
      process.env.Admin_Email,
      process.env.Admin_Password,
      user.email
    );

    if (!otp) return res.status(400).json({ message: "OTP not generated" });

    // Save OTP to db
    user.transactionOTP = otp;
    await user.save();

    res.status(201).json({
      message: "OTP Successfully Generated",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Confirm OTP
 * @route POST /api/confirm-otp
 */
const confirmOTP = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { otp } = req.body;

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.transactionOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    res.status(200).json({
      message: "OTP Successfully Confirmed",
    });
  } catch (error) {
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
  generateOTP,
  confirmOTP,
};
