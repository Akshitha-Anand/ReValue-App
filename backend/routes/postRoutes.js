const express = require("express");
const router = express.Router();

const postController = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Create Post (Individual/Household)
router.post("/", authMiddleware, upload.single("image"), postController.createPost);

// Get all posts (Feed / Marketplace)
router.get("/", postController.getAllPosts);

// Get nearby posts based on collector coordinates
router.get("/nearby", authMiddleware, postController.getNearbyPosts);

// Get single post
router.get("/:id", postController.getPostById);

// Get nearby eligible collectors for a post
router.get("/:id/nearby-collectors", authMiddleware, postController.getNearbyCollectorsForPost);

module.exports = router;