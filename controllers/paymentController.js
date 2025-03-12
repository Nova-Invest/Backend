const axios = require('axios');
const User = require('../models/User');
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

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

      // Convert amount from kobo to Naira
      const amountInNaira = amount / 100;

      // Update the user's wallet balance
      user.balances.walletBalance += amountInNaira;

      // Add the transaction to the user's transactions array
      user.transactions.push({
        type: 'fund_wallet',
        amount: amountInNaira,
        date: new Date(),
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

module.exports = { verifyPayment };