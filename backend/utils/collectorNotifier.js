/**
 * Collector Discovery & Notification Dispatcher
 * Implements Haversine distance filtering, duplicate prevention, and real-time socket delivery.
 */

const User = require("../models/User");
const Notification = require("../models/Notification");
const { calculateHaversineDistance, isValidCoordinate } = require("./haversine");
const { sendNotificationToUser } = require("./socketManager");

const DEFAULT_RADIUS_KM = parseFloat(process.env.COLLECTOR_SEARCH_RADIUS_KM) || 5.0;

/**
 * Finds eligible collectors within proximity radius who accept the material category.
 * @param {Object} post - Post object with latitude, longitude, category, createdBy
 * @param {number} customRadiusKm - Optional radius override
 * @returns {Array} List of { collector, distanceKm } sorted by distance ascending
 */
async function findNearbyEligibleCollectors(post, customRadiusKm = null) {
    if (!post || !isValidCoordinate(post.latitude, post.longitude)) {
        return [];
    }

    const listingCat = (post.category || "").toLowerCase().trim();

    // Query active collectors with valid coordinates
    const collectors = await User.find({
        role: "collector",
        isAvailable: true,
        "locationCoordinates.latitude": { $ne: null },
        "locationCoordinates.longitude": { $ne: null }
    }).select("name email phone collectorType hubLocation areasServed materialsAccepted vehicleType serviceRadiusKm locationCoordinates rating");

    const eligible = [];

    for (const collector of collectors) {
        // Exclude the poster themselves if they are a collector
        if (collector._id.toString() === post.createdBy?.toString()) {
            continue;
        }

        // Check material compatibility
        const accepted = (collector.materialsAccepted || []).map(m => m.toLowerCase().trim());
        const acceptsCategory = accepted.length === 0 || 
            accepted.includes("all") || 
            accepted.includes(listingCat);

        if (!acceptsCategory) {
            continue;
        }

        const colLat = collector.locationCoordinates.latitude;
        const colLon = collector.locationCoordinates.longitude;

        if (!isValidCoordinate(colLat, colLon)) {
            continue;
        }

        const distance = calculateHaversineDistance(post.latitude, post.longitude, colLat, colLon);

        // Effective search radius: custom radius > collector radius > system default
        const maxRadius = customRadiusKm || collector.serviceRadiusKm || DEFAULT_RADIUS_KM;

        if (distance <= maxRadius) {
            eligible.push({
                collector,
                distanceKm: distance,
                maxRadiusKm: maxRadius
            });
        }
    }

    // Rank collectors by proximity (nearest first)
    eligible.sort((a, b) => a.distanceKm - b.distanceKm);
    return eligible;
}

/**
 * Dispatches notifications to all nearby eligible collectors for a newly created listing.
 * Guarantees duplicate prevention through database unique compound index and pre-check.
 * @param {Object} post
 * @returns {Object} Dispatch summary { notifiedCount, deliveredRealtimeCount, collectors }
 */
async function notifyNearbyCollectorsForPost(post) {
    if (!post || !isValidCoordinate(post.latitude, post.longitude)) {
        return { notifiedCount: 0, deliveredRealtimeCount: 0, reason: "No valid coordinates for post" };
    }

    const eligibleCollectors = await findNearbyEligibleCollectors(post);
    let notifiedCount = 0;
    let deliveredRealtimeCount = 0;
    const notifiedCollectors = [];

    for (const item of eligibleCollectors) {
        const { collector, distanceKm } = item;

        try {
            // Check if notification already exists to avoid duplicate errors
            const existing = await Notification.findOne({
                recipient: collector._id,
                post: post._id,
                type: "NEW_NEARBY_LISTING"
            });

            if (existing) {
                continue; // Prevent duplicates
            }

            const notification = new Notification({
                recipient: collector._id,
                sender: post.createdBy,
                post: post._id,
                type: "NEW_NEARBY_LISTING",
                title: `New ${post.category.toUpperCase()} Pickup Nearby!`,
                message: `${post.weight} ${post.unit || "kg"} of ${post.category} (${post.condition || "Sorted"}) listed ${distanceKm} km from your hub.`,
                distanceKm,
                actionStatus: "pending",
                metadata: {
                    category: post.category,
                    weight: post.weight,
                    unit: post.unit || "kg",
                    condition: post.condition,
                    locationArea: post.location || "Nearby area", // Neighborhood only, no private address
                    priceMin: post.priceMin,
                    priceMax: post.priceMax
                }
            });

            await notification.save();
            notifiedCount++;
            notifiedCollectors.push({ id: collector._id, name: collector.name, distanceKm });

            // Real-time WebSocket delivery
            const delivered = sendNotificationToUser(collector._id, "newNotification", {
                _id: notification._id,
                title: notification.title,
                message: notification.message,
                distanceKm,
                post: post._id,
                type: notification.type,
                createdAt: notification.createdAt
            });

            if (delivered) {
                deliveredRealtimeCount++;
            }

        } catch (notifErr) {
            // If duplicate key error (E11000) occurred due to concurrent request, ignore safely
            if (notifErr.code === 11000) {
                console.log(`[Notification] Duplicate prevented for collector ${collector._id} on post ${post._id}`);
            } else {
                console.error(`[Notification] Failed to create notification for ${collector._id}:`, notifErr.message);
            }
        }
    }

    return {
        notifiedCount,
        deliveredRealtimeCount,
        collectors: notifiedCollectors
    };
}

module.exports = {
    DEFAULT_RADIUS_KM,
    findNearbyEligibleCollectors,
    notifyNearbyCollectorsForPost
};
