const axios = require("axios");
const User = require("../models/User");
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

/**
 * @desc Verify Paystack payment
 * @route GET /api/payment/verify
 */
const verifyPayment = async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ message: "No reference provided" });
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

    if (status === "success") {
      // Find the user using the userId from the metadata
      const user = await User.findById(metadata.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Convert amount from kobo to Naira
      const amountInNaira = amount / 100;

      // Update the user's wallet balance
      user.balances.walletBalance += amountInNaira;

      // Add the transaction to the user's transactions array
      user.transactions.push({
        type: "fund_wallet",
        amount: amountInNaira,
        date: new Date(),
        status: "completed",
      });

      // Save the updated user document
      await user.save();

      // Return success response
      res.status(200).json({ message: "Payment successful", user });
    } else {
      // Payment was not successful
      res.status(400).json({ message: "Payment not successful" });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

// Withdrawal
const createRecipient = async (req, res) => {
  try {
    const { account_number, bank_code, name } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transferrecipient",
      {
        type: "nuban",
        name,
        account_number,
        bank_code,
        currency: "NGN",
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error handling withdrawal:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

const withdraw = async (req, res) => {
  try {
    const { amount, recipient_code } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount,
        recipient: recipient_code,
        reason: "Test Withdrawal",
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error handling withdrawal:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

const finalizeTransfer = async (req, res) => {
  try {
    const { transfer_code, otp } = req.body;

    const response = await axios.post(
      `https://api.paystack.co/transfer/finalize_transfer/`,
      {
        transfer_code,
        otp,
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error finalizing transfer:", error);
    res.status(500).json({ message: "Error finalizing transfer" });
  }
};

module.exports = { verifyPayment, createRecipient, withdraw, finalizeTransfer };
