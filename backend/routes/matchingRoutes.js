const express = require("express");
const router = express.Router();
const matchingController = require("../controllers/matchingController");
const authMiddleware = require("../middleware/authMiddleware");

// Protected Matching Routes
router.get("/for-post/:postId", authMiddleware, matchingController.getIndustryMatchesForPost);
router.get("/for-industry", authMiddleware, matchingController.getAvailableMaterialsForIndustry);
router.post("/reserve/:postId", authMiddleware, matchingController.reserveListing);
router.put("/industry-requirements", authMiddleware, matchingController.updateIndustryRequirements);

module.exports = router;
