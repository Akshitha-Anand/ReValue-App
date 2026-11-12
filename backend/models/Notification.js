const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: null
    },
    type: {
        type: String,
        enum: [
            "NEW_NEARBY_LISTING",
            "COLLECTION_REQUEST",
            "REQUEST_ACCEPTED",
            "REQUEST_REJECTED",
            "INDUSTRY_MATCH",
            "SYSTEM"
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    distanceKm: {
        type: Number,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    actionStatus: {
        type: String,
        enum: ["none", "pending", "accepted", "rejected"],
        default: "none"
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound unique index to prevent duplicate notifications for the same collector, post, and type
notificationSchema.index(
    { recipient: 1, post: 1, type: 1 },
    { 
        unique: true,
        partialFilterExpression: { post: { $type: "objectId" } }
    }
);

module.exports = mongoose.model("Notification", notificationSchema);
