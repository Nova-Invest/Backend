const express = require("express");
const {
  verifyPayment,
  createRecipient,
  withdraw,
  finalizeTransfer,
  resolveAccount,
  webhook,
  manualBalanceUpdate
} = require("../controllers/paymentController");

const router = express.Router();

// Verify payment
router.get("/verify", verifyPayment);
router.post("/create-recipient", createRecipient);
router.post("/withdraw", withdraw);
router.post("/finalize-transfer", finalizeTransfer); //
router.post("/resolve", resolveAccount); // For getting  bank account info
router.post("/paystack-webhook", webhook); // Webhook for live updates
router.post("/manual-balance-update", manualBalanceUpdate);

module.exports = router;
