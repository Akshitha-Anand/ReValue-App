const Post = require("../models/Post");
const User = require("../models/User");
const { isValidCoordinate, calculateHaversineDistance } = require("../utils/haversine");
const { notifyNearbyCollectorsForPost, findNearbyEligibleCollectors, DEFAULT_RADIUS_KM } = require("../utils/collectorNotifier");

// CREATE POST
exports.createPost = async (req, res) => {
    try {
        const {
            title, description, category, condition, location,
            weight, unit, priceMin, priceMax, pincode,
            latitude, longitude, exactAddress,
            aiPredictedCategory, aiConfidence, isConfirmedByUser
        } = req.body;

        const image = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : req.body.image || null;

        // Parse coordinates if provided
        const numLat = latitude !== undefined && latitude !== "" ? Number(latitude) : null;
        const numLon = longitude !== undefined && longitude !== "" ? Number(longitude) : null;

        if ((numLat !== null && numLon === null) || (numLat === null && numLon !== null)) {
            return res.status(400).json({
                message: "Both latitude and longitude must be provided together."
            });
        }

        if (numLat !== null && numLon !== null && !isValidCoordinate(numLat, numLon)) {
            return res.status(400).json({
                message: "Invalid latitude (-90 to 90) or longitude (-180 to 180) coordinates provided."
            });
        }

        const post = new Post({
            createdBy: req.user.id,
            title,
            description,
            category,
            condition,
            location,
            pincode,
            latitude: numLat,
            longitude: numLon,
            exactAddress: exactAddress || "",
            weight: Number(weight) || 0,
            unit: unit || "kg",
            priceMin: priceMin ? Number(priceMin) : undefined,
            priceMax: priceMax ? Number(priceMax) : undefined,
            image,
            aiPredictedCategory: aiPredictedCategory || null,
            aiConfidence: aiConfidence ? Number(aiConfidence) : null,
            isConfirmedByUser: isConfirmedByUser === "true" || isConfirmedByUser === true
        });

        await post.save();

        // Asynchronously notify nearby collectors
        let dispatchResult = { notifiedCount: 0, deliveredRealtimeCount: 0 };
        if (numLat !== null && numLon !== null) {
            try {
                dispatchResult = await notifyNearbyCollectorsForPost(post);
                console.log(`[Collector Discovery] Notified ${dispatchResult.notifiedCount} collectors for post ${post._id}`);
            } catch (dispatchErr) {
                console.error("[Collector Discovery] Error during collector notification:", dispatchErr);
            }
        }

        res.status(201).json({
            message: "Post created successfully",
            post,
            notifications: dispatchResult
        });

    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({
            message: "Error creating post",
            error: error.message
        });
    }
};

// GET ALL POSTS (FEED)
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("createdBy", "name email role rating")
            .sort({ createdAt: -1 });

        // Privacy filter: Mask exact address in public marketplace
        const sanitized = posts.map(p => {
            const doc = p.toObject();
            delete doc.exactAddress; // Privacy protected
            return doc;
        });

        res.json(sanitized);

    } catch (error) {
        res.status(500).json({
            message: "Error fetching posts",
            error: error.message
        });
    }
};

// GET SINGLE POST
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("createdBy", "name email role rating phone")
            .populate("collectorId", "name email phone");

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        const postObj = post.toObject();

        // Privacy Check: Only disclose exact pickup address if requesting user is creator or accepted collector
        const requestingUserId = req.user ? req.user.id : null;
        const isOwner = requestingUserId && post.createdBy && post.createdBy._id.toString() === requestingUserId;
        const isAssignedCollector = requestingUserId && post.collectorId && post.collectorId._id.toString() === requestingUserId;

        if (!isOwner && !isAssignedCollector) {
            delete postObj.exactAddress;
        }

        res.json(postObj);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// GET NEARBY POSTS FOR COLLECTOR
exports.getNearbyPosts = async (req, res) => {
    try {
        let lat = req.query.lat ? Number(req.query.lat) : null;
        let lon = req.query.lon ? Number(req.query.lon) : null;
        const radius = req.query.radius ? Number(req.query.radius) : DEFAULT_RADIUS_KM;

        // If coordinates not in query, check logged in collector's profile
        if (lat === null || lon === null) {
            if (req.user) {
                const user = await User.findById(req.user.id);
                if (user && user.locationCoordinates && isValidCoordinate(user.locationCoordinates.latitude, user.locationCoordinates.longitude)) {
                    lat = user.locationCoordinates.latitude;
                    lon = user.locationCoordinates.longitude;
                }
            }
        }

        if (lat === null || lon === null || !isValidCoordinate(lat, lon)) {
            return res.status(400).json({
                message: "Please provide valid 'lat' and 'lon' coordinates or update your profile location."
            });
        }

        // Query available posts with coordinates
        const posts = await Post.find({
            status: "available",
            latitude: { $ne: null },
            longitude: { $ne: null }
        }).populate("createdBy", "name email role rating");

        // Calculate Haversine distance and filter
        const nearby = [];
        for (const post of posts) {
            const dist = calculateHaversineDistance(lat, lon, post.latitude, post.longitude);
            if (dist <= radius) {
                const doc = post.toObject();
                delete doc.exactAddress; // Privacy protected until accepted
                doc.distanceKm = dist;
                nearby.push(doc);
            }
        }

        // Rank by distance ascending
        nearby.sort((a, b) => a.distanceKm - b.distanceKm);

        res.json({
            count: nearby.length,
            searchCenter: { latitude: lat, longitude: lon },
            radiusKm: radius,
            posts: nearby
        });

    } catch (error) {
        console.error("Error fetching nearby posts:", error);
        res.status(500).json({
            message: "Error fetching nearby posts",
            error: error.message
        });
    }
};

// DISCOVER NEARBY COLLECTORS FOR A POST
exports.getNearbyCollectorsForPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const eligible = await findNearbyEligibleCollectors(post);
        res.json({
            postId: post._id,
            category: post.category,
            eligibleCollectorsCount: eligible.length,
            collectors: eligible.map(e => ({
                id: e.collector._id,
                name: e.collector.name,
                distanceKm: e.distanceKm,
                collectorType: e.collector.collectorType,
                rating: e.collector.rating,
                vehicleType: e.collector.vehicleType
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};