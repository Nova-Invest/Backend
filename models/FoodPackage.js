const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  image: {
    type: String
  }
}, { _id: true });

const foodPackageSchema = new mongoose.Schema(
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
    fixedPrice: {
      type: Number,
      required: true
    },
    foodItems: [foodItemSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    image: {
      type: String
    },
    category: {
      type: String,
      enum: ['basic', 'premium', 'deluxe'],
      default: 'basic'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FoodPackage", foodPackageSchema);