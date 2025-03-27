const express = require("express");
const {
  verifyPayment,
  createRecipient,
  withdraw,
} = require("../controllers/paymentController");

const router = express.Router();

// Verify payment
router.get("/verify", verifyPayment);
router.post("/create-recipient", createRecipient);
router.post("/withdraw", withdraw);

module.exports = router;
