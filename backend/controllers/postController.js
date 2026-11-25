const Post = require("../models/Post");
const User = require("../models/User");
const Chat = require("../models/Chat");
const { sendNotificationToUser } = require("../utils/socketManager");
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

        const defaultCategoryThumbnails = {
            plastic: 'https://images.unsplash.com/photo-1611284446314-60a5840ce3d2?auto=format&fit=crop&q=80&w=400',
            paper: 'https://images.unsplash.com/photo-1595278148419-3549e3e3bdf5?auto=format&fit=crop&q=80&w=400',
            metal: 'https://images.unsplash.com/photo-1572205336214-41d89bf44a7f?auto=format&fit=crop&q=80&w=400',
            ewaste: 'https://images.unsplash.com/photo-1550083395-65abdb20b606?auto=format&fit=crop&q=80&w=400',
            glass: 'https://images.unsplash.com/photo-1517524285303-d6fc683dddf8?auto=format&fit=crop&q=80&w=400'
        };
        const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || defaultCategoryThumbnails[category] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400';

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

// COLLECTOR QUOTES A POST
exports.quotePost = async (req, res) => {
    try {
        const { priceMin, priceMax, note } = req.body;
        const postId = req.params.id;

        if (priceMin === undefined || priceMin === null || priceMin === "") {
            return res.status(400).json({ message: "Minimum price quote is required." });
        }

        const post = await Post.findById(postId).populate("createdBy", "name email");
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const collector = await User.findById(req.user.id).select("name role");
        if (!collector || collector.role !== "collector") {
            return res.status(403).json({ message: "Only verified collectors can submit price quotes." });
        }

        const numMin = Number(priceMin);
        const numMax = priceMax !== undefined && priceMax !== "" ? Number(priceMax) : numMin;

        post.quotedPriceMin = numMin;
        post.quotedPriceMax = numMax;
        post.quotedBy = collector._id;
        post.quoteNote = note || "";
        post.status = "quoted";
        await post.save();

        // Create an automated negotiation message in chat to seller
        const messageText = `🚛 Collector Quote Offer: ₹${numMin} - ₹${numMax}/${post.unit || 'kg'} for '${post.title}'. ${note ? `Note: ${note}` : 'Ready for pickup!'}`;
        try {
            const chatMsg = new Chat({
                sender: collector._id,
                receiver: post.createdBy._id || post.createdBy,
                message: messageText
            });
            await chatMsg.save();

            sendNotificationToUser(post.createdBy._id || post.createdBy, "receiveMessage", chatMsg);
            sendNotificationToUser(collector._id, "messageSent", chatMsg);
        } catch (chatErr) {
            console.error("Quote chat auto-dispatch error:", chatErr);
        }

        res.json({
            message: "Quote sent successfully to seller!",
            post
        });
    } catch (error) {
        console.error("Error quoting post:", error);
        res.status(500).json({ message: "Error submitting quote", error: error.message });
    }
};

// COLLECTOR BUYS / FULFILLS A POST
exports.buyPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { pricePaid } = req.body;

        const post = await Post.findById(postId).populate("createdBy", "name email");
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const collector = await User.findById(req.user.id);
        if (!collector || collector.role !== "collector") {
            return res.status(403).json({ message: "Only collectors can mark a post as Bought." });
        }

        if (post.status === "bought" || post.status === "completed") {
            return res.status(400).json({ message: "This listing has already been bought and collected." });
        }

        const weightNum = Number(post.weight) || 0;
        const finalPrice = pricePaid !== undefined && pricePaid !== ""
            ? Number(pricePaid)
            : (post.quotedPriceMin ? Number(post.quotedPriceMin) * weightNum : (post.priceMin ? Number(post.priceMin) * weightNum : 0));

        // Update post status
        post.status = "bought";
        post.collectorId = collector._id;
        post.boughtAt = new Date();
        post.finalPricePaid = finalPrice;
        await post.save();

        // Update collector metrics & history
        collector.totalCollected = (collector.totalCollected || 0) + weightNum;
        collector.totalPickups = (collector.totalPickups || 0) + 1;
        collector.totalSpent = (collector.totalSpent || 0) + finalPrice;

        if (!collector.collectionHistory) {
            collector.collectionHistory = [];
        }

        const sellerName = post.createdBy?.name || "Individual Seller";
        collector.collectionHistory.unshift({
            postId: post._id,
            title: post.title,
            category: post.category,
            weight: weightNum,
            unit: post.unit || "kg",
            pricePaid: finalPrice,
            sellerName: sellerName,
            date: new Date()
        });

        await collector.save();

        // Send confirmation chat message to seller
        const confirmMsg = `✅ Waste Bought & Collected! Your listing '${post.title}' (${weightNum} ${post.unit || 'kg'}) was collected by ${collector.name}. Total payout: ₹${finalPrice}.`;
        try {
            const chatMsg = new Chat({
                sender: collector._id,
                receiver: post.createdBy._id || post.createdBy,
                message: confirmMsg
            });
            await chatMsg.save();

            sendNotificationToUser(post.createdBy._id || post.createdBy, "receiveMessage", chatMsg);
            sendNotificationToUser(collector._id, "messageSent", chatMsg);
        } catch (chatErr) {
            console.error("Buy post auto-notification error:", chatErr);
        }

        res.json({
            message: "Waste marked as Bought! Added to your collection history.",
            post,
            collectorStats: {
                totalCollected: collector.totalCollected,
                totalPickups: collector.totalPickups,
                totalSpent: collector.totalSpent
            }
        });
    } catch (error) {
        console.error("Error marking post as bought:", error);
        res.status(500).json({ message: "Error processing bought status", error: error.message });
    }
};

// GET COLLECTOR STOCKS FOR INDUSTRY VIEW
exports.getCollectorStock = async (req, res) => {
    try {
        const collectors = await User.find({ role: "collector" })
            .select("name email phone hubLocation areasServed materialsAccepted vehicleType operatingHours rating reviewCount verified totalCollected totalPickups totalSpent collectionHistory")
            .sort({ totalCollected: -1 });

        // Calculate material inventory breakdown for each collector
        const result = collectors.map(c => {
            const history = c.collectionHistory || [];
            const inventory = {
                plastic: 0,
                paper: 0,
                metal: 0,
                ewaste: 0,
                glass: 0
            };

            for (const item of history) {
                const cat = (item.category || "").toLowerCase();
                if (inventory[cat] !== undefined) {
                    inventory[cat] += Number(item.weight) || 0;
                }
            }

            // If collector has default demo volume, supplement with realistic baseline
            const totalKg = c.totalCollected || (history.length > 0 ? history.reduce((s, h) => s + (h.weight || 0), 0) : 340);
            if (inventory.plastic === 0 && inventory.paper === 0) {
                inventory.plastic = Math.round(totalKg * 0.45);
                inventory.paper = Math.round(totalKg * 0.30);
                inventory.metal = Math.round(totalKg * 0.15);
                inventory.ewaste = Math.round(totalKg * 0.10);
            }

            return {
                _id: c._id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                hubLocation: c.hubLocation || "Bengaluru Hub",
                materialsAccepted: c.materialsAccepted && c.materialsAccepted.length > 0
                    ? c.materialsAccepted
                    : ["plastic", "paper", "metal", "ewaste"],
                rating: c.rating || 4.8,
                verified: c.verified !== undefined ? c.verified : true,
                totalCollected: totalKg,
                totalPickups: c.totalPickups || Math.max(history.length, 12),
                inventory,
                recentCollections: history.slice(0, 5)
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Error fetching collector stocks:", error);
        res.status(500).json({ message: "Error fetching collector stocks", error: error.message });
    }
};

// GET BOUGHT COLLECTIONS FOR LOGGED IN COLLECTOR
exports.getMyCollections = async (req, res) => {
    try {
        const collectorId = req.user.id;
        const boughtPosts = await Post.find({
            collectorId: collectorId,
            status: { $in: ["bought", "completed"] }
        })
        .populate("createdBy", "name email phone")
        .sort({ boughtAt: -1, createdAt: -1 });

        res.json(boughtPosts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching collections", error: error.message });
    }
};