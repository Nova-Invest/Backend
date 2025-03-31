const express = require("express");
const {
  verifyPayment,
  createRecipient,
  withdraw,
  finalizeTransfer,
  resolveAccount,
} = require("../controllers/paymentController");

const router = express.Router();

// Verify payment
router.get("/verify", verifyPayment);
router.post("/create-recipient", createRecipient);
router.post("/withdraw", withdraw);
router.post("/finalize-transfer", finalizeTransfer); //
router.post("/resolve", resolveAccount); // For getting  bank account info

module.exports = router;
