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

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error("Error creating recipient:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      message: "Error creating recipient",
      error: error.response?.data?.message || error.message 
    });
  }
};

const resolveAccount = async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;

    const response = await axios.get("https://api.paystack.co/bank/resolve", {
      params: {
        account_number: account_number,
        bank_code: bank_code,
      },
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error("Error resolving account:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Error resolving account",
      error: error.response?.data?.message || error.message
    });
  }
};

const withdraw = async (req, res) => {
  try {
    const { amount, recipient_code } = req.body;
    const user = await User.findById(req.user.id); // Assuming you're using auth middleware

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Convert amount to kobo (Paystack uses kobo for NGN)
    const amountInKobo = amount * 100;

    // Check if user has sufficient balance
    if (user.balances.withdrawableBalance < amount) {
      return res.status(400).json({ 
        success: false,
        message: "Insufficient balance" 
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: amountInKobo, // Amount in kobo
        recipient: recipient_code,
        reason: "Withdrawal request",
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Only deduct balance if transfer was initiated successfully
    if (response.data.status === true) {
      user.balances.withdrawableBalance -= amount;
      
      const transaction = {
        type: "withdrawal",
        amount,
        status: "pending", // Will be updated via webhook or finalize
        reference: response.data.data.reference,
        transfer_code: response.data.data.transfer_code,
        recipient_code: recipient_code,
        date: new Date()
      };

      user.transactions.push(transaction);
      await user.save();

      return res.json({
        success: true,
        message: "Withdrawal initiated successfully",
        data: response.data.data,
        transaction
      });
    } else {
      return res.status(400).json({ 
        success: false,
        message: "Transfer initiation failed",
        data: response.data
      });
    }
  } catch (error) {
    console.error("Error handling withdrawal:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      message: "Error processing withdrawal",
      error: error.response?.data?.message || error.message 
    });
  }
};

const finalizeTransfer = async (req, res) => {
  try {
    const { transfer_code, otp } = req.body;
    const user = await User.findById(req.user.id); // Assuming you're using auth middleware

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transfer/finalize_transfer",
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

    // Find and update the corresponding transaction
    const transactionIndex = user.transactions.findIndex(
      t => t.transfer_code === transfer_code
    );
    
    if (transactionIndex !== -1) {
      user.transactions[transactionIndex].status = 
        response.data.status === "success" ? "completed" : "failed";
      user.transactions[transactionIndex].updatedAt = new Date();
      
      // If transfer failed, refund the amount
      if (response.data.status !== "success") {
        user.balances.withdrawableBalance += user.transactions[transactionIndex].amount;
      }
      
      await user.save();
    }

    res.json({
      success: response.data.status === "success",
      message: response.data.message || "Transfer finalized",
      data: response.data.data
    });
  } catch (error) {
    console.error("Error finalizing transfer:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      message: "Error finalizing transfer",
      error: error.response?.data?.message || error.message 
    });
  }
};

module.exports = {
  verifyPayment,
  createRecipient,
  withdraw,
  finalizeTransfer,
  resolveAccount,
};
