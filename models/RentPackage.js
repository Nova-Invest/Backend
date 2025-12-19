const mongoose = require("mongoose");

const rentPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    image: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentPackage", rentPackageSchema);
