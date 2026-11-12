const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { evaluateIndustryCompatibility, DEFAULT_MATCHING_WEIGHTS } = require("../utils/industryMatcher");
const { sendNotificationToUser } = require("../utils/socketManager");

// GET MATCHED INDUSTRIES FOR A SPECIFIC POST / BATCH
exports.getIndustryMatchesForPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
            .populate("createdBy", "name email phone");

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Custom weights query params if provided
        const customWeights = {};
        if (req.query.wMat) customWeights.material = parseFloat(req.query.wMat);
        if (req.query.wQty) customWeights.quantity = parseFloat(req.query.wQty);
        if (req.query.wLoc) customWeights.location = parseFloat(req.query.wLoc);
        if (req.query.wQual) customWeights.quality = parseFloat(req.query.wQual);

        // Fetch all registered verified or active industries
        const industries = await User.find({ role: "industry" })
            .select("name email phone industryType gstin materialsRequired monthlyDemand minQuantityRequired qualityPreference locationCoordinates rating verified");

        const matches = [];
        for (const ind of industries) {
            const match = evaluateIndustryCompatibility(post, ind, customWeights);
            if (match) {
                matches.push({
                    ...match,
                    industryDetails: {
                        id: ind._id,
                        name: ind.name,
                        industryType: ind.industryType,
                        phone: ind.phone,
                        email: ind.email,
                        verified: ind.verified,
                        rating: ind.rating
                    }
                });
            }
        }

        // Sort by compatibility score descending
        matches.sort((a, b) => b.score - a.score);

        res.json({
            postId: post._id,
            materialCategory: post.category,
            weight: post.weight,
            unit: post.unit,
            appliedWeights: { ...DEFAULT_MATCHING_WEIGHTS, ...customWeights },
            totalMatches: matches.length,
            matches
        });

    } catch (err) {
        console.error("Error matching industries for post:", err);
        res.status(500).json({ message: "Failed to compute industry matches", error: err.message });
    }
};

// GET COMPATIBLE AVAILABLE MATERIALS FOR LOGGED-IN INDUSTRY
exports.getAvailableMaterialsForIndustry = async (req, res) => {
    try {
        const industry = await User.findById(req.user.id);
        if (!industry || industry.role !== "industry") {
            return res.status(403).json({ message: "Only industry accounts can view tailored supply matches." });
        }

        // Custom weights query params if provided
        const customWeights = {};
        if (req.query.wMat) customWeights.material = parseFloat(req.query.wMat);
        if (req.query.wQty) customWeights.quantity = parseFloat(req.query.wQty);
        if (req.query.wLoc) customWeights.location = parseFloat(req.query.wLoc);
        if (req.query.wQual) customWeights.quality = parseFloat(req.query.wQual);

        // Find available posts
        const posts = await Post.find({ status: "available" })
            .populate("createdBy", "name email role rating");

        const matches = [];
        for (const post of posts) {
            const match = evaluateIndustryCompatibility(post, industry, customWeights);
            if (match) {
                const postDoc = post.toObject();
                delete postDoc.exactAddress; // Privacy protected until reserved
                matches.push({
                    matchScore: match.score,
                    normalizedScore: match.normalizedScore,
                    breakdown: match.breakdown,
                    distanceKm: match.distanceKm,
                    explanations: match.explanations,
                    post: postDoc
                });
            }
        }

        // Sort by match score descending
        matches.sort((a, b) => b.matchScore - a.matchScore);

        res.json({
            industryId: industry._id,
            industryName: industry.name,
            requirements: {
                materialsRequired: industry.materialsRequired,
                monthlyDemand: industry.monthlyDemand,
                minQuantityRequired: industry.minQuantityRequired,
                qualityPreference: industry.qualityPreference
            },
            totalMatches: matches.length,
            matches
        });

    } catch (err) {
        console.error("Error fetching materials for industry:", err);
        res.status(500).json({ message: "Failed to compute material matches", error: err.message });
    }
};

// ATOMIC CONCURRENCY-SAFE RESERVATION BY INDUSTRY
exports.reserveListing = async (req, res) => {
    try {
        const postId = req.params.postId;
        const industryId = req.user.id;

        const industry = await User.findById(industryId);
        if (!industry || industry.role !== "industry") {
            return res.status(403).json({ message: "Only verified industry accounts can reserve materials." });
        }

        // Atomic check-and-set: status must be strictly 'available'
        const updatedPost = await Post.findOneAndUpdate(
            { _id: postId, status: "available" },
            {
                status: "reserved",
                industryId: industryId
            },
            { new: true }
        ).populate("createdBy", "name email phone");

        if (!updatedPost) {
            return res.status(409).json({
                message: "This material listing is no longer available or was concurrently reserved by another industry."
            });
        }

        // Notify seller/collector about the reservation
        if (updatedPost.createdBy) {
            const notif = new Notification({
                recipient: updatedPost.createdBy._id,
                sender: industryId,
                post: updatedPost._id,
                type: "INDUSTRY_MATCH",
                title: "Material Reserved by Industry!",
                message: `${industry.name} has reserved your ${updatedPost.weight} ${updatedPost.unit} of ${updatedPost.category}!`,
                actionStatus: "accepted",
                metadata: {
                    industryName: industry.name,
                    industryPhone: industry.phone,
                    industryEmail: industry.email
                }
            });
            await notif.save();

            sendNotificationToUser(updatedPost.createdBy._id, "newNotification", {
                _id: notif._id,
                title: notif.title,
                message: notif.message,
                post: updatedPost._id,
                type: notif.type
            });
        }

        res.json({
            success: true,
            message: `Successfully reserved ${updatedPost.title} for ${industry.name}.`,
            post: updatedPost
        });

    } catch (err) {
        console.error("Error reserving listing:", err);
        res.status(500).json({ message: "Failed to reserve material listing", error: err.message });
    }
};

// UPDATE INDUSTRY REQUIREMENTS
exports.updateIndustryRequirements = async (req, res) => {
    try {
        const { materialsRequired, monthlyDemand, minQuantityRequired, qualityPreference, locationCoordinates } = req.body;

        const updateFields = {};
        if (materialsRequired !== undefined) updateFields.materialsRequired = materialsRequired;
        if (monthlyDemand !== undefined) updateFields.monthlyDemand = monthlyDemand;
        if (minQuantityRequired !== undefined) updateFields.minQuantityRequired = Number(minQuantityRequired);
        if (qualityPreference !== undefined) updateFields.qualityPreference = qualityPreference;
        if (locationCoordinates !== undefined) updateFields.locationCoordinates = locationCoordinates;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true }
        ).select("-password");

        res.json({
            success: true,
            message: "Industry material requirements updated successfully",
            user: updatedUser
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
