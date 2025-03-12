const axios = require('axios');
const User = require('../models/User');
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

/**
 * @desc Initialize Paystack payment
 * @route POST /api/payment/initialize
 */
const initializePayment = async (req, res) => {
  const { amount } = req.body;

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100, // Paystack expects amount in kobo
        email: req.user.email, // Assuming user is authenticated and req.user is available
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

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

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const { status, amount, customer } = response.data.data;

    if (status === 'success') {
      const user = await User.findOne({ email: customer.email });

      if (user) {
        user.balances.walletBalance += amount / 100; // Convert back to Naira
        user.transactions.push({
          type: 'fund_wallet',
          amount: amount / 100,
          status: 'completed',
        });

        await user.save();
        res.status(200).json({ message: 'Payment successful', user });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

module.exports = { initializePayment, verifyPayment };