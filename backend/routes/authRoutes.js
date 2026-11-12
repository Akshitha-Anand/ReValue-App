const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Get current profile
router.get("/me", authMiddleware, authController.getProfile);

// Update profile location & settings
router.put("/profile/location", authMiddleware, authController.updateProfileLocation);

module.exports = router;