const express = require("express");
const router = express.Router();

const postController = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Create Post (Individual/Household)
router.post("/", authMiddleware, upload.single("image"), postController.createPost);

// Get all posts (Feed / Marketplace)
router.get("/", postController.getAllPosts);

// Collector Stock Inventory (for Industry View)
router.get("/collector-stock", postController.getCollectorStock);

// Collector's own fulfilled purchases
router.get("/my-collections", authMiddleware, postController.getMyCollections);

// Get nearby posts based on collector coordinates
router.get("/nearby", authMiddleware, postController.getNearbyPosts);

// Collector quotes price on a post
router.post("/:id/quote", authMiddleware, postController.quotePost);

// Collector marks a post as Bought
router.put("/:id/buy", authMiddleware, postController.buyPost);

// Get single post
router.get("/:id", postController.getPostById);

// Get nearby eligible collectors for a post
router.get("/:id/nearby-collectors", authMiddleware, postController.getNearbyCollectorsForPost);

module.exports = router;