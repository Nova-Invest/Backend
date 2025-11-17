// models/HouseholdBundle.js
const mongoose = require('mongoose');

const bundleItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  quantity: {
    type: String,
    default: '1 unit'
  }
}, { _id: false });

const householdBundleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  items: [bundleItemSchema],
  totalPrice: {
    type: Number,
    required: true,
    min: 1000
  },
  image: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('HouseholdBundle', householdBundleSchema);