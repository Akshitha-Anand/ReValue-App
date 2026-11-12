const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// POST /api/ai/classify - protected endpoint
router.post("/classify", authMiddleware, upload.single("image"), aiController.classifyWasteImage);

module.exports = router;
