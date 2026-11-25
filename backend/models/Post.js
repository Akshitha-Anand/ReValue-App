const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    condition: String,
    weight: Number,
    unit: String,
    priceMin: Number,
    priceMax: Number,
    quotedPriceMin: {
        type: Number,
        default: null
    },
    quotedPriceMax: {
        type: Number,
        default: null
    },
    quotedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    quoteNote: {
        type: String,
        default: ""
    },
    location: String,
    pincode: String,
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    exactAddress: {
        type: String,
        default: ""
    },
    image: String,
    aiPredictedCategory: {
        type: String,
        default: null
    },
    aiConfidence: {
        type: Number,
        default: null
    },
    isConfirmedByUser: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: ["available", "quoted", "requested", "accepted", "reserved", "bought", "completed", "cancelled"],
        default: "available"
    },
    boughtAt: {
        type: Date,
        default: null
    },
    finalPricePaid: {
        type: Number,
        default: null
    },
    collectorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    industryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

postSchema.index({ status: 1, category: 1 });
postSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model("Post", postSchema);