const mongoose = require('mongoose');

const InvestmentPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: Number, // Duration in months
    required: true,
  },
  interestRate: {
    type: Number, // Interest rate in percentage
    required: true,
  },
  investmentAmount: {
    type: Number,
    required: true,
  },
  users: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
      },
      amountInvested: {
        type: Number,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('InvestmentPackage', InvestmentPackageSchema);