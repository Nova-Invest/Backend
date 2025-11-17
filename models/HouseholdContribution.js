// models/HouseholdContribution.js
const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['wallet', 'transfer', 'card'], default: 'wallet' },
  transactionReference: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
}, { _id: true });

const householdContributionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bundleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HouseholdBundle',
    required: true
  },
  repaymentMonths: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  monthlyPayment: {
    type: Number,
    required: true
  },
  nextPaymentDate: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  paymentHistory: [paymentHistorySchema],
  currentMonth: {
    type: Number,
    default: 1
  },
  totalMonths: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Auto-calculate remaining amount & completion status
householdContributionSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  this.isCompleted = this.remainingAmount <= 0;
  if (this.isCompleted) {
    this.isActive = false;
    this.endDate = this.endDate || new Date();
  }
  next();
});

module.exports = mongoose.model('HouseholdContribution', householdContributionSchema);