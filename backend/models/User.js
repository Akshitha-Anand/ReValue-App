const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    // ─── Common Fields ──────────────────────────────
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: {
        type: String,
        enum: ["individual", "collector", "industry"],
        required: true
    },
    address: String,
    profilePicture: String,

    // ─── Individual User Fields ──────────────────────
    // (plain individuals only need common fields above)

    // ─── Collector Fields ────────────────────────────
    collectorType: {
        type: String,
        enum: ["individual", "organization"],  // individual collector vs org-affiliated
        default: null
    },
    hubLocation: { type: String, trim: true },         // physical hub address / city
    areasServed: { type: [String], default: [] },       // areas/zones covered
    materialsAccepted: { type: [String], default: ["plastic", "paper", "metal", "glass", "ewaste", "organic"] }, // materials they collect
    vehicleType: String,                                // bike / truck / auto
    operatingHours: String,                             // e.g. "9am-6pm Mon-Sat"
    serviceRadiusKm: { type: Number, default: 5 },     // search radius (default 5 km, configurable)
    isAvailable: { type: Boolean, default: true },      // active status for accepting jobs

    // ─── Location Coordinates (Opt-in) ───────────────
    locationCoordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },

    // ─── Industry / Organization Fields ─────────────
    industryType: { type: String, trim: true },         // Plastic Recycling, E-Waste, etc.
    gstin: { type: String, trim: true },                // GSTIN number for verification
    companyWebsite: String,
    materialsRequired: { type: [String], default: [] }, // what they want to buy
    monthlyDemand: String,                              // e.g. "50 Tons/month"
    minQuantityRequired: { type: Number, default: 10 }, // minimum required quantity in kg
    qualityPreference: { type: String, default: "any" }, // any, clean, sorted, high
    businessAddress: String,
    contactPerson: String,                              // point-of-contact name

    // ─── Verification & Status ───────────────────────
    verified: { type: Boolean, default: false },        // AI / admin verified
    verificationScore: { type: Number, default: 0 },    // 0-100 trust score
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }

});

userSchema.index({ role: 1, isAvailable: 1 });
userSchema.index({ "locationCoordinates.latitude": 1, "locationCoordinates.longitude": 1 });

module.exports = mongoose.model("User", userSchema);