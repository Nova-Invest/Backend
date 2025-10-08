const axios = require("axios");
const User = require("../models/User");
const mongoose = require("mongoose"); 
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const crypto = require("crypto");

/**
 * @desc Verify Paystack payment
 * @route GET /api/payment/verify
 */
const verifyPayment = async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ message: "No reference provided" });
  }

  // Get Paystack secret key from environment
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  // Validate the secret key
  if (!paystackSecretKey) {
    console.error('Paystack secret key is not configured');
    return res.status(500).json({ 
      message: "Payment configuration error", 
      error: "Server configuration incomplete" 
    });
  }

  // Validate key format (should start with sk_live_ or sk_test_)
  if (!paystackSecretKey.startsWith('sk_live_') && !paystackSecretKey.startsWith('sk_test_')) {
    console.error('Invalid Paystack key format');
    return res.status(500).json({ 
      message: "Payment configuration error", 
      error: "Invalid API key format" 
    });
  }

  try {
    console.log(`Verifying payment with reference: ${reference}`);
    console.log(`Using key: ${paystackSecretKey.substring(0, 10)}...`);

    // Verify the payment with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log('Paystack response status:', paystackResponse.status);
    console.log('Paystack response data:', paystackResponse.data);

    const { status, amount, metadata, currency } = paystackResponse.data.data;

    if (status === "success") {
      // Validate that we have the required metadata
      if (!metadata || !metadata.userId) {
        return res.status(400).json({ message: "User ID not found in payment metadata" });
      }

      // Find the user using the userId from the metadata
      const user = await User.findById(metadata.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Convert amount from kobo to Naira (if currency is NGN)
      let amountInNaira = amount;
      if (currency === 'NGN') {
        amountInNaira = amount / 100;
      }

      console.log(`Updating wallet for user ${user._id} with amount: ${amountInNaira}`);

      // Update the user's wallet balance
      user.balances.walletBalance += amountInNaira;

      // Add the transaction to the user's transactions array
      user.transactions.push({
        type: "fund_wallet",
        amount: amountInNaira,
        date: new Date(),
        status: "completed",
        reference: reference,
        currency: currency || 'NGN'
      });

      // Save the updated user document
      await user.save();

      console.log(`Wallet updated successfully for user: ${user._id}`);

      // Return success response with updated user
      return res.status(200).json({ 
        message: "Payment successful", 
        user: {
          _id: user._id,
          email: user.email,
          balances: user.balances,
          transactions: user.transactions
        }
      });
    } else {
      // Payment was not successful
      console.log(`Payment not successful. Status: ${status}`);
      return res.status(400).json({ 
        message: `Payment not successful. Status: ${status}` 
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    
    if (error.response) {
      console.error('Paystack API response error:', error.response.data);
      const paystackError = error.response.data;
      
      // Handle specific Paystack errors
      if (paystackError.message === 'Invalid key') {
        return res.status(500).json({ 
          message: "Payment configuration error", 
          error: "Invalid API key provided" 
        });
      } else if (paystackError.message === 'Transaction not found') {
        return res.status(404).json({ 
          message: "Transaction not found", 
          error: "Invalid reference number" 
        });
      }
      
      return res.status(500).json({ 
        message: "Error verifying payment", 
        error: paystackError.message || error.message 
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        message: "Payment verification timeout", 
        error: "Request took too long" 
      });
    }
    
    return res.status(500).json({ 
      message: "Error verifying payment", 
      error: error.message 
    });
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
    const user = await User.findById(req.body.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (amount > user.balances.withdrawableBalance) {
      return res.status(400).json({ message: "Insufficient Funds" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: amount * 100, // Convert to kobo
        recipient: recipient_code,
        reason: "Withdrawal From Growvewst",
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { status, message, data } = response.data;

    if (!status) {
      return res.status(500).json({
        message: message || "Payment transfer failed",
        data,
      });
    }

    // Determine transaction status
    let transactionStatus = "pending";
    if (data.status === "success") transactionStatus = "completed";
    else if (data.status === "failed") {
      return res.status(500).json({ message: "Payment Error", data });
    }

    // Update user balance and record transaction
    user.balances.withdrawableBalance -= amount;
    user.transactions.push({
      type: "withdrawal",
      amount,
      status: transactionStatus,
      transfer_code: data.transfer_code || "None",
    });

    await user.save();

    return res.status(200).json({
      message: message || "Transfer initiated",
      data,
    });
  } catch (error) {
    console.error(
      "Error handling withdrawal:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      message: "Error verifying payment",
      error: error.response?.data || error.message,
    });
  }
};

const finalizeTransfer = async (req, res) => {
  try {
    const { transfer_code, otp } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

    user.withdrawableBalance = user.withdrawableBalance - amount;
    user.transactions.push({
      type: "withdrawal",
      amount,
      status: "completed",
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error finalizing transfer:", error);
    res.status(500).json({ message: "Error finalizing transfer" });
  }
}; // Using otp

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

    res.json(response.data); // Send the response data to the client
  } catch (error) {
    console.error("Error resolving account:", error);
    res.status(500).json({
      message: "Error resolving account",
      error: error.message,
      errors: error,
    });
  }
};

const webhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", paystackSecretKey)
      .update(JSON.stringify(req.body))
      .digest("hex");
    const signature = req.headers["x-paystack-signature"];

    if (hash !== signature) {
      return res.status(401).json({ message: "UNAUTHORIZED!!" });
    }

    const event = req.body;

    if (
      event.event === "transfer.success" ||
      event.event === "transfer.failed"
    ) {
      const transferCode = event.data.transfer_code;
      const newStatus =
        event.event === "transfer.success" ? "success" : "failed";

      const user = await User.findOne({
        "transactions.transfer_code": transferCode,
      });

      if (user) {
        await User.updateOne(
          { "transactions.transfer_code": transferCode },
          {
            $set: {
              "transactions.$.status":
                newStatus === "success" ? "completed" : "pending",
            },
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: "Error updating payment" });
  }
};

const manualBalanceUpdate = async (req, res) => {
  try {
    const { userId, amount, balanceType } = req.body;

    // Validate input
    if (!userId || amount === undefined || !balanceType) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: userId, amount, or balanceType" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID format" 
      });
    }

    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ 
        success: false,
        message: "Amount must be a positive number" 
      });
    }

    // Map balance types to valid transaction types
    const typeMap = {
      walletBalance: 'manual_wallet_update',
      withdrawableBalance: 'manual_withdrawable_update',
      investedBalance: 'manual_invested_update',
      cooperativeBalance: 'manual_cooperative_update'
    };

    if (!typeMap[balanceType]) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid balance type. Must be one of: ${Object.keys(typeMap).join(', ')}` 
      });
    }

    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Record old balance for transaction history
    const oldBalance = user.balances[balanceType] || 0;

    // Update the balance
    user.balances[balanceType] = amount;

    // Add transaction record using the mapped type
    user.transactions.push({
      type: typeMap[balanceType],
      amount: amount - oldBalance,
      date: new Date(),
      status: "completed",
      description: `Manual ${balanceType} adjustment`,
      reference: `MANUAL-${Date.now()}`,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Balance updated successfully",
      data: {
        userId: user._id,
        [balanceType]: user.balances[balanceType],
        previousBalance: oldBalance,
        balanceChange: amount - oldBalance
      }
    });

  } catch (error) {
    console.error("Error in manual balance update:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  }
};

module.exports = {
  verifyPayment,
  createRecipient,
  withdraw,
  finalizeTransfer,
  resolveAccount,
  webhook,
  manualBalanceUpdate
};
