const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  joinDate: { type: Date, default: Date.now },
  nextPaymentDate: { type: Date, required: true },
  paymentsMade: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastPaymentDate: { type: Date },
}, { _id: false });

const CooperativePackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    duration: { type: Number, required: true }, // in months
    contributionAmount: { type: Number, required: true },
    contributionFrequency: { 
      type: String, 
      required: true,
      enum: ['weekly', 'bi-weekly', 'monthly'],
      default: 'monthly'
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CooperativePackage", CooperativePackageSchema);