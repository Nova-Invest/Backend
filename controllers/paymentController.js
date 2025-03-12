const axios = require('axios');
const User = require('../models/User');
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

/**
 * @desc Initialize Paystack payment
 * @route POST /api/payment/initialize
 */
const initializePayment = async (req, res) => {
  const { amount } = req.body;

  // Validate the amount
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ message: 'Please provide a valid amount' });
  }

  try {
    // Fetch the user from the database using the ID from the token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize Paystack payment
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100, // Paystack expects amount in kobo
        email: user.email, // Use the user's email from the database
        metadata: {
          userId: user._id, // Include user ID in metadata for reference
        },
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Return the Paystack authorization URL to the frontend
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error initializing Paystack payment:', error);
    res.status(500).json({ message: 'Error initializing payment' });
  }
};

/**
 * @desc Verify Paystack payment
 * @route GET /api/payment/verify
 */
const verifyPayment = async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ message: 'No reference provided' });
  }

  try {
    // Verify the payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const { status, amount, metadata } = response.data.data;

    if (status === 'success') {
      // Find the user using the userId from the metadata
      const user = await User.findById(metadata.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update the user's wallet balance
      user.balances.walletBalance += amount / 100; // Convert back to Naira

      // Add the transaction to the user's transactions array
      user.transactions.push({
        type: 'fund_wallet',
        amount: amount / 100,
        status: 'completed',
      });

      // Save the updated user document
      await user.save();

      // Return success response
      res.status(200).json({ message: 'Payment successful', user });
    } else {
      // Payment was not successful
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

module.exports = { initializePayment, verifyPayment };