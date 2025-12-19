const User = require('../models/User');

const kycMiddleware = async (req, res, next) => {
  try {
    // Admins (issued token from adminLogin) are allowed
    if (req.user && req.user.username) return next();

    if (!req.user || !req.user.id) return res.status(401).json({ message: '❌ Unauthorized' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: '❌ User not found' });

    if (!user.kyc || user.kyc.status !== 'verified') {
      return res.status(403).json({ message: '❌ KYC not verified. Please complete KYC to access this resource.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = kycMiddleware;
