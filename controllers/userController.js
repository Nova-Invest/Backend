const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

    await user.remove();
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
      phoneNumber,
      address,
      nin,
      dob,
      bankName,
      accountNumber,
      accountName,
      profileImage,
    } = req.body;

    // const user = await User.findById(req.params.id);
    // if (!user) return res.status(404).json({ message: "User not found" });

    // user.phoneNumber = phoneNumber;
    // user.address = address;
    // user.nin = nin;
    // user.dob = dob;
    // user.bankDetails = {
    //   accountName,
    //   accountNumber,
    //   bankName,
    // };
    // user.profile.profilePicture = profileImage;

    // await user.save();
    res.status(200).json({
      phoneNumber,
      address,
      nin,
      dob,
      bankName,
      accountNumber,
      accountName,
      profileImage,
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
};
