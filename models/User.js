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
      "manual_wallet_update",          // Added
      "manual_withdrawable_update",     // Added
      "manual_invested_update",         // Added
      "manual_cooperative_update"       // Added
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
    transactionOTP: { 
      type: String 
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);