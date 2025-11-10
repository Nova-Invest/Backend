// models/HouseholdBundle.js
const mongoose = require('mongoose');

const bundleItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String }
});

const householdBundleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Home Essentials Pack"
  description: { type: String },
  items: [bundleItemSchema],                          // list of items in bundle
  totalPrice: { type: Number, required: true },       // sum of all items
  image: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('HouseholdBundle', householdBundleSchema);