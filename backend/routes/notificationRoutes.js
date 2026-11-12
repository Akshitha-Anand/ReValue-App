const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// Protected notification routes
router.get("/", authMiddleware, notificationController.getUserNotifications);
router.put("/read-all", authMiddleware, notificationController.markAllAsRead);
router.put("/:id/read", authMiddleware, notificationController.markAsRead);
router.post("/:id/accept", authMiddleware, notificationController.acceptCollectionRequest);
router.post("/:id/reject", authMiddleware, notificationController.rejectCollectionRequest);

module.exports = router;
