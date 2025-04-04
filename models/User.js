const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String }, // Token field added
    profileCompleted: { type: Boolean, default: false },
    transactionOTP: { type: String }, // OTP for transactions

    profile: {
      profilePicture: { type: String },
      dob: { type: Date },
      nin: { type: String },
      address: { type: String },
    },

    transactions: [
      {
        type: {
          type: String,
          enum: ["withdrawal", "fund_wallet", "investment"],
          required: true,
        },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        transfer_code: { type: String },
      },
    ],

    balances: {
      investedBalance: { type: Number, default: 0 },
      withdrawableBalance: { type: Number, default: 0 },
      walletBalance: { type: Number, default: 0 },
    },

    nextOfKin: {
      fullName: { type: String },
      relationship: { type: String },
      phoneNumber: { type: String },
    },

    bankDetails: {
      accountName: { type: String },
      accountNumber: { type: String },
      bankName: { type: String },
    },

    investmentPackage: [
      {
        name: { type: String },
        startDate: { type: Date },
        maturityDate: { type: Date },
        amountInvested: { type: Number },
        interestRate: { type: Number }, // in percentage
        duration: { type: String }, // e.g., "6 months", "1 year"
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
