const Notification = require("../models/Notification");
const Post = require("../models/Post");
const User = require("../models/User");
const { sendNotificationToUser } = require("../utils/socketManager");

// GET ALL NOTIFICATIONS FOR LOGGED IN USER
exports.getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate("sender", "name email role phone")
            .populate("post", "title category weight unit condition image status exactAddress location")
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipient: req.user.id,
            isRead: false
        });

        res.json({
            unreadCount,
            notifications
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ message: "Error fetching notifications", error: err.message });
    }
};

// MARK AS READ
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ success: true, notification });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// MARK ALL AS READ
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { isRead: true }
        );
        res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// COLLECTOR ACCEPTS COLLECTION REQUEST
exports.acceptCollectionRequest = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        const postId = notification.post;
        if (!postId) {
            return res.status(400).json({ message: "Notification does not reference a valid post" });
        }

        // Atomic update to prevent race conditions (two collectors accepting the same post)
        const updatedPost = await Post.findOneAndUpdate(
            { _id: postId, status: { $in: ["available", "requested"] } },
            { status: "accepted", collectorId: req.user.id },
            { new: true }
        ).populate("createdBy", "name email phone");

        if (!updatedPost) {
            notification.actionStatus = "rejected";
            await notification.save();
            return res.status(409).json({
                message: "This listing has already been accepted or is no longer available."
            });
        }

        // Update current notification
        notification.actionStatus = "accepted";
        notification.isRead = true;
        await notification.save();

        const collector = await User.findById(req.user.id).select("name phone email vehicleType");

        // Notify the seller/individual that their listing was accepted!
        if (updatedPost.createdBy) {
            const sellerNotification = new Notification({
                recipient: updatedPost.createdBy._id,
                sender: req.user.id,
                post: updatedPost._id,
                type: "REQUEST_ACCEPTED",
                title: "Collection Confirmed!",
                message: `Collector ${collector.name} has accepted to pick up your ${updatedPost.category} listing!`,
                actionStatus: "accepted",
                metadata: {
                    collectorName: collector.name,
                    collectorPhone: collector.phone,
                    vehicleType: collector.vehicleType
                }
            });

            await sellerNotification.save();

            sendNotificationToUser(updatedPost.createdBy._id, "newNotification", {
                _id: sellerNotification._id,
                title: sellerNotification.title,
                message: sellerNotification.message,
                post: updatedPost._id,
                type: sellerNotification.type,
                createdAt: sellerNotification.createdAt
            });
        }

        res.json({
            success: true,
            message: "Collection accepted successfully! You may now proceed with pickup.",
            post: updatedPost
        });

    } catch (err) {
        console.error("Error accepting collection:", err);
        res.status(500).json({ message: "Failed to accept collection request", error: err.message });
    }
};

// COLLECTOR REJECTS COLLECTION REQUEST
exports.rejectCollectionRequest = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { actionStatus: "rejected", isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({
            success: true,
            message: "Collection request declined.",
            notification
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
