const express = require("express");
const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  editUser,
  addUser,
  adminLogin,
  addNextOfKin,
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-login", adminLogin);

// Protected Routes (Requires JWT)
router.get("/", authMiddleware, getAllUsers);
router.get("/:id", authMiddleware, getUserById);
router.put("/:id", authMiddleware, updateUser);
router.delete("/:id", authMiddleware, deleteUser);
router.put("/edit-user/:id", authMiddleware, editUser);
router.post("/add-user", authMiddleware, addUser);
router.post("/add-next-of-kin/:id", authMiddleware, addNextOfKin);

module.exports = router;
