const mongoose = require("mongoose");

// Define the cooperative membership schema
const cooperativeMembershipSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CooperativePackage",
    required: true
  },
  packageName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  nextPaymentDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  contributionAmount: {
    type: Number,
    required: true
  },
  contributionFrequency: {
    type: String,
    enum: ['weekly', 'bi-weekly', 'monthly'],
    required: true
  },
  paymentsMade: {
    type: Number,
    default: 0
  },
  lastPaymentDate: {
    type: Date
  },
}, { _id: false });

// Define the transaction schema
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
  "withdrawal",
  "fund_wallet",
  "investment",
  "cooperative_payment",
  "cooperative_withdrawal",
  "manual_wallet_update",
  "manual_withdrawable_update",
  "manual_invested_update",
  "manual_cooperative_update",
  "food_package_payment",
  "activation_fee",
  "housing_payment",
  "rent_payment",                  // Already there – good for monthly repayments
  "rent_service_charge",           // NEW: For the 20% upfront service charge
  "rent_disbursement",             // NEW: For crediting the full rent amount to withdrawable balance
  "household_bundle_payment"
],
    required: true,
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  transfer_code: {
    type: String
  },
  reference: {
    type: String
  },
  description: {
    type: String
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CooperativePackage"
  },
  packageName: {
    type: String
  },
}, { _id: false, timestamps: true });

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    token: {
      type: String
    },
    profileCompleted: {
      type: Boolean,
      default: false
    },
    tempOTP: {
      type: String,
      default: undefined,
    },
    otpExpiry: {
      type: Date,
      default: undefined,
    },

    profile: {
      profilePicture: {
        type: String
      },
      dob: {
        type: Date
      },
      nin: {
        type: String
      },
      address: {
        type: String
      },
    },

    transactions: [transactionSchema],

    balances: {
      investedBalance: {
        type: Number,
        default: 0
      },
      withdrawableBalance: {
        type: Number,
        default: 0
      },
      walletBalance: {
        type: Number,
        default: 0
      },
      cooperativeBalance: {
        type: Number,
        default: 0
      }
    },

    nextOfKin: {
      fullName: {
        type: String
      },
      relationship: {
        type: String
      },
      phoneNumber: {
        type: String
      },
    },

    bankDetails: {
      accountName: {
        type: String
      },
      accountNumber: {
        type: String
      },
      bankName: {
        type: String
      },
    },

    // KYC information and status
    kyc: {
      status: {
        type: String,
        enum: ['not_submitted', 'pending', 'verified', 'rejected'],
        default: 'not_submitted'
      },
      fullName: { type: String },
      nin: { type: String },
      ninImage: { type: String },
      workIdImage: { type: String },
      utilityBillImage: { type: String },
      salaryRange: { type: String },
      position: { type: String },
      employerName: { type: String },
      employerAddress: { type: String },
      homeAddress: { type: String },
      officeAddress: { type: String },
      additionalDocuments: [{ type: String }],
      submittedAt: { type: Date },
      verifiedAt: { type: Date },
      rejectedAt: { type: Date },
      rejectionReason: { type: String }
    },

    investmentPackage: [
      {
        name: {
          type: String
        },
        startDate: {
          type: Date
        },
        maturityDate: {
          type: Date
        },
        amountInvested: {
          type: Number
        },
        interestRate: {
          type: Number
        },
        duration: {
          type: String
        },
      },
    ],

    cooperativeMemberships: [cooperativeMembershipSchema],
    foodContributions: [{
      contributionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodContribution"
      },
      packageName: {
        type: String
      },
      startDate: {
        type: Date
      },
      status: {
        type: String,
        enum: ['active', 'completed', 'cancelled']
      }
    }],
    housingContributions: [{
      contributionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HousingContribution"
      },
      packageName: {
        type: String
      },
      startDate: {
        type: Date
      },
      status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
      }
    }],
    householdContributions: [{
      contributionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HouseholdContribution"
      },
      bundleName: {
        type: String
      },
      startDate: {
        type: Date
      },
      status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
      }
    }],
    rentContributions: [{
      contributionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentContribution"
      },
      packageName: {
        type: String
      },
      startDate: {
        type: Date
      },
      status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
      }
    }],
    isActivated: {
      type: Boolean,
      default: false
    },
    activationDate: {
      type: Date
    },
    activationExpiration: {
      type: Date
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);