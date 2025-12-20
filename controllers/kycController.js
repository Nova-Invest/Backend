const User = require('../models/User');

// @desc Submit KYC
// @route POST /api/kyc/submit
// @access Private
const submitKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      nin,
      ninImage,
      workIdImage,
      utilityBillImage,
      salaryRange,
      position,
      employerName,
      employerAddress,
      homeAddress,
      officeAddress,
      additionalDocuments
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: '❌ User not found' });

    // Update kyc subdocument
    user.kyc = {
      status: 'pending',
      fullName,
      nin,
      ninImage,
      workIdImage,
      utilityBillImage,
      salaryRange,
      position,
      employerName,
      employerAddress,
      homeAddress,
      officeAddress,
      additionalDocuments: additionalDocuments || [],
      submittedAt: new Date()
    };

    await user.save();

    res.status(200).json({ message: '✅ KYC submitted successfully', kyc: user.kyc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get own KYC
// @route GET /api/kyc/me
// @access Private
const getMyKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('kyc');
    if (!user) return res.status(404).json({ message: '❌ User not found' });
    res.status(200).json(user.kyc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin: get all KYC submissions
// @route GET /api/kyc/submissions
// @access Private (Admin)
const getAllKYCSubmissions = async (req, res) => {
  try {

    const users = await User.find({ 'kyc.status': { $in: ['pending', 'rejected', 'verified'] } }).select('kyc email firstName lastName');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin: verify KYC
// @route PUT /api/kyc/:userId/verify
// @access Private (Admin)
const verifyKYC = async (req, res) => {
  try {

    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: '❌ User not found' });

    if (!user.kyc || user.kyc.status === 'not_submitted') {
      return res.status(400).json({ message: '❌ No KYC submission found for this user' });
    }

    user.kyc.status = 'verified';
    user.kyc.verifiedAt = new Date();
    user.kyc.rejectionReason = undefined;

    await user.save();

    res.status(200).json({ message: '✅ KYC verified', kyc: user.kyc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin: reject KYC
// @route PUT /api/kyc/:userId/reject
// @access Private (Admin)
const rejectKYC = async (req, res) => {
  try {

    const { userId } = req.params;
    const { reason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: '❌ User not found' });

    if (!user.kyc || user.kyc.status === 'not_submitted') {
      return res.status(400).json({ message: '❌ No KYC submission found for this user' });
    }

    user.kyc.status = 'rejected';
    user.kyc.rejectedAt = new Date();
    user.kyc.rejectionReason = reason || 'Not specified';

    await user.save();

    res.status(200).json({ message: '✅ KYC rejected', kyc: user.kyc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitKYC,
  getMyKYC,
  getAllKYCSubmissions,
  verifyKYC,
  rejectKYC
};
