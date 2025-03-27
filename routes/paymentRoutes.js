const express = require("express");
const {
  verifyPayment,
  createRecipient,
  withdraw,
  finalizeTransfer,
} = require("../controllers/paymentController");

const router = express.Router();

// Verify payment
router.get("/verify", verifyPayment);
router.post("/create-recipient", createRecipient);
router.post("/withdraw", withdraw);
router.post("/finalize-transfer", finalizeTransfer);

module.exports = router;
