const express = require("express");
const router = express.Router();
const cooperativeController = require("../controllers/cooperativeController");
const authMiddleware = require("../middlewares/authMiddleware");

// Public routes
router.get("/", cooperativeController.getAllCooperativePackages);
router.get("/:id", cooperativeController.getCooperativePackageById);

// Admin routes
router.post("/", cooperativeController.createCooperativePackage);
router.put("/:id", authMiddleware, cooperativeController.updateCooperativePackage);
router.delete("/:id", authMiddleware, cooperativeController.deleteCooperativePackage);

// Member routes
router.post("/:id/join", authMiddleware, cooperativeController.joinCooperativePackage);
router.post("/:id/pay", authMiddleware, cooperativeController.makeCooperativePayment);
router.post("/:id/leave", authMiddleware, cooperativeController.leaveCooperativePackage);

// User contribution routes
router.get("/users/:userId/cooperative-contributions", authMiddleware, cooperativeController.getUserContributions);
router.get("/users/:userId/cooperative-contributions/:packageId", authMiddleware, cooperativeController.getContributionDetails);
router.get("/:packageId/payments", authMiddleware, cooperativeController.getPaymentHistory);

module.exports = router;