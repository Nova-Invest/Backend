const User = require("../models/User");

const activationMiddleware = async (req, res, next) => {
  try {
    // Get user from decoded JWT (set by authMiddleware)
    let user;
    if (req.user.id) {
      // From loginUser (payload: { id: user._id })
      user = await User.findById(req.user.id);
    } else if (req.user.email) {
      // From registerUser (payload: { email })
      user = await User.findOne({ email: req.user.email });
    } else if (req.user.username) {
      // From adminLogin (payload: { username })
      // Assuming admin users don't need activation for package access
      return next(); // Skip activation check for admins
    } else {
      return res.status(400).json({ message: "Invalid token payload" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActivated) {
      return res.status(403).json({
        message: "Account not activated. Please activate your account to access packages.",
      });
    }

    if (user.activationExpiration < new Date()) {
      user.isActivated = false; // Auto-deactivate if expired
      await user.save();
      return res.status(403).json({ message: "Account activation expired. Please reactivate." });
    }

    // Attach user to request for downstream use
    req.userDocument = user;
    next();
  } catch (error) {
    console.error("Error in activation middleware:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = activationMiddleware;