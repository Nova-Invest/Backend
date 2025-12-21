const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  // Get the Authorization header
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '❌ Access Denied. No token provided or invalid format.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ message: '❌ Access Denied. Empty token.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Critical: Ensure decoded has 'id' and it's a valid MongoDB ObjectId
    if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(400).json({ message: '❌ Invalid user ID in token.' });
    }

    // Attach clean user object to request
    req.user = {
      id: decoded.id,
      // If you have admin field in JWT (e.g., username for admin)
      username: decoded.username || null,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: '❌ Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '❌ Token expired.' });
    }
    res.status(400).json({ message: '❌ Token validation failed.' });
  }
};

module.exports = authMiddleware;