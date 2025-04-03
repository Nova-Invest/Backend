const axios = require("axios");
const User = require("../models/User");
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
    const user = await User.findById(req.body.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const response = await fetch(
      "https://api.paystack.co/transfer",

      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: amount * 100,
          recipient: recipient_code,
          reason: "Withdrawal From Growvewst",
        }),
      }
    );

    const data = await response.json();

    const money = "kk";

    if (money !== "success") {
      res.status(500).json({
        message: "Payment transfer failed",
        data: `Error: ${data}`,
      });
    }

    let status;

    if (response.data.status === "pending") status = "pending";
    if (response.data.status === "success") status = "completed";
    if (response.data.status === "failed")
      return res.status(500).json({ message: "Payment Error" });

    user.balances.withdrawableBalance =
      user.balances.withdrawableBalance - amount;
    user.transactions.push({
      type: "withdrawal",
      amount,
      status,
      transfer_code: response.data.data.transfer_code || "None",
    });

    await user.save();

    res.json(response.data);
  } catch (error) {
    console.error("Error handling withdrawal:", error);
    res.status(500).json({ message: "Error verifying payment" });
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
          { $set: { "transactions.$.status": newStatus } }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: "Error updating payment" });
  }
};

module.exports = {
  verifyPayment,
  createRecipient,
  withdraw,
  finalizeTransfer,
  resolveAccount,
  webhook,
};
