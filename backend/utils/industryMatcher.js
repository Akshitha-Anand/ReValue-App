/**
 * Intelligent Collector-Industry Matching Algorithm
 * 
 * Step 1: Mandatory Eligibility Filtering (status, material compatibility, minimum quantity)
 * Step 2: Multi-Criteria Weighted Compatibility Scoring
 *         Score = (w_mat * S_mat) + (w_qty * S_qty) + (w_loc * S_loc) + (w_qual * S_qual)
 *         Normalized component scores [0, 1], configurable weights summing to 1.0.
 */

const { calculateHaversineDistance, isValidCoordinate } = require("./haversine");

// Default weights summing to 1.0
const DEFAULT_MATCHING_WEIGHTS = {
    material: 0.35,
    quantity: 0.25,
    location: 0.20,
    quality: 0.20
};

// Unit conversion factors to canonical Kilograms (kg)
const UNIT_TO_KG = {
    kg: 1.0,
    kilogram: 1.0,
    kilograms: 1.0,
    ton: 1000.0,
    tons: 1000.0,
    tonne: 1000.0,
    tonnes: 1000.0,
    quintal: 100.0,
    quintals: 100.0,
    gram: 0.001,
    grams: 0.001,
    g: 0.001,
    lb: 0.453592,
    lbs: 0.453592
};

/**
 * Converts a given quantity and unit into canonical kilograms.
 * @param {number} qty
 * @param {string} unit
 * @returns {number} Quantity in kg
 */
function toCanonicalKg(qty, unit) {
    if (!qty || Number.isNaN(Number(qty)) || Number(qty) < 0) return 0;
    const cleanUnit = (unit || "kg").toLowerCase().trim();
    const factor = UNIT_TO_KG[cleanUnit];
    if (factor === undefined) {
        throw new Error(`Unsupported unit of measurement: '${unit}'`);
    }
    return Number(qty) * factor;
}

/**
 * Normalizes quality/condition string to a suitability score [0, 1].
 * @param {string} condition
 * @param {string} qualityPreference
 * @returns {number}
 */
function scoreQuality(condition, qualityPreference) {
    const cond = (condition || "").toLowerCase();
    const pref = (qualityPreference || "any").toLowerCase();

    // Condition baseline score
    let baseScore = 0.7; // default good
    if (cond.includes("clean") || cond.includes("sorted") || cond.includes("intact") || cond.includes("washed") || cond.includes("crushed")) {
        baseScore = 1.0;
    } else if (cond.includes("good") || cond.includes("dry")) {
        baseScore = 0.85;
    } else if (cond.includes("mixed") || cond.includes("fair")) {
        baseScore = 0.65;
    } else if (cond.includes("non-working") || cond.includes("scrap") || cond.includes("damaged")) {
        baseScore = 0.50;
    }

    if (pref === "any") return baseScore;
    if (pref === "high" || pref === "sorted") {
        return baseScore >= 0.85 ? 1.0 : baseScore * 0.7;
    }
    return baseScore;
}

/**
 * Calculates compatibility score between an available batch/listing and an industry.
 * 
 * @param {Object} listing - { category, weight, unit, condition, latitude, longitude, status }
 * @param {Object} industry - { name, materialsRequired, minQuantityRequired, monthlyDemand, locationCoordinates, qualityPreference }
 * @param {Object} customWeights - optional overrides for weights
 * @returns {Object|null} Match details with score and explanation, or null if ineligible
 */
function evaluateIndustryCompatibility(listing, industry, customWeights = {}) {
    // ─── STEP 1: Mandatory Eligibility Filtering ───
    if (!listing || !industry) return null;

    // Check status
    if (listing.status && listing.status !== "available") {
        return null;
    }

    const listingCat = (listing.category || "").toLowerCase().trim();
    const acceptedCats = (industry.materialsRequired || []).map(c => c.toLowerCase().trim());

    // Material eligibility: industry must require this material category
    const isMaterialEligible = acceptedCats.some(req => 
        req === listingCat || 
        req.includes(listingCat) || 
        listingCat.includes(req) ||
        req === "all"
    );

    if (!isMaterialEligible) {
        return null; // Ineligible
    }

    // Convert listing weight to kg
    const listingKg = toCanonicalKg(listing.weight, listing.unit);
    if (listingKg <= 0) {
        return null;
    }

    // Minimum quantity check
    const minRequiredKg = toCanonicalKg(industry.minQuantityRequired || 0, "kg");
    if (listingKg < minRequiredKg) {
        return null; // Insufficient quantity for this industry
    }

    // ─── STEP 2: Multi-Criteria Weighted Scoring ───
    const weights = { ...DEFAULT_MATCHING_WEIGHTS, ...customWeights };
    const weightSum = weights.material + weights.quantity + weights.location + weights.quality;
    // Normalize weights to sum exactly to 1.0
    const wMat = weights.material / weightSum;
    const wQty = weights.quantity / weightSum;
    const wLoc = weights.location / weightSum;
    const wQual = weights.quality / weightSum;

    // 1. Material Compatibility (0.85 - 1.0)
    const exactMatch = acceptedCats.includes(listingCat);
    const materialScore = exactMatch ? 1.0 : 0.85;

    // 2. Quantity Suitability (0 - 1.0)
    // Compare listing quantity with industry monthly demand target
    let targetKg = 1000; // default 1 Ton
    if (industry.monthlyDemand) {
        const match = industry.monthlyDemand.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const rawVal = parseFloat(match[1]);
            const lowerDemand = industry.monthlyDemand.toLowerCase();
            if (lowerDemand.includes("ton")) targetKg = rawVal * 1000;
            else if (lowerDemand.includes("quintal")) targetKg = rawVal * 100;
            else targetKg = rawVal;
        }
    }
    // Suitability approaches 1.0 as available quantity matches or fulfills demand comfortably
    const quantityRatio = listingKg / Math.max(targetKg, 1);
    const quantityScore = Math.min(Math.max(quantityRatio, 0.2), 1.0);

    // 3. Location / Transportation Suitability (0 - 1.0)
    let locationScore = 0.7; // default if coordinates missing
    let distanceKm = null;
    const hasListingCoords = isValidCoordinate(listing.latitude, listing.longitude);
    const hasIndustryCoords = industry.locationCoordinates && 
        isValidCoordinate(industry.locationCoordinates.latitude, industry.locationCoordinates.longitude);

    if (hasListingCoords && hasIndustryCoords) {
        distanceKm = calculateHaversineDistance(
            listing.latitude, listing.longitude,
            industry.locationCoordinates.latitude, industry.locationCoordinates.longitude
        );
        // Scaled against maximum standard supply radius (e.g. 50 km)
        const maxRadius = 50.0;
        locationScore = Math.max(0, 1 - (distanceKm / maxRadius));
        locationScore = Math.min(Math.max(locationScore, 0.05), 1.0);
    }

    // 4. Quality Compatibility (0 - 1.0)
    const qualityScore = scoreQuality(listing.condition, industry.qualityPreference);

    // Composite Weighted Score
    const totalScore = (wMat * materialScore) + 
                       (wQty * quantityScore) + 
                       (wLoc * locationScore) + 
                       (wQual * qualityScore);

    const roundedScore = Math.round(totalScore * 100); // 0 to 100%

    // Human-readable explanation factors
    const explanations = [];
    if (exactMatch) {
        explanations.push(`Exact match for ${listing.category} recycling requirement`);
    } else {
        explanations.push(`Compatible material type for ${listing.category}`);
    }

    explanations.push(`Provides ${listingKg.toFixed(1)} kg towards production demand`);

    if (distanceKm !== null) {
        explanations.push(`Located ${distanceKm} km away (${locationScore > 0.7 ? "Local proximity" : "Regional transport required"})`);
    } else {
        explanations.push(`Location pending coordinate verification`);
    }

    if (qualityScore >= 0.9) {
        explanations.push(`High grade condition (${listing.condition || "Clean"})`);
    } else {
        explanations.push(`Condition: ${listing.condition || "Standard"}`);
    }

    return {
        industryId: industry._id,
        industryName: industry.name || industry.industryType,
        score: roundedScore,
        normalizedScore: Math.round(totalScore * 1000) / 1000,
        breakdown: {
            materialScore: Math.round(materialScore * 100) / 100,
            quantityScore: Math.round(quantityScore * 100) / 100,
            locationScore: Math.round(locationScore * 100) / 100,
            qualityScore: Math.round(qualityScore * 100) / 100,
            weights: { wMat, wQty, wLoc, wQual }
        },
        distanceKm,
        explanations
    };
}

module.exports = {
    DEFAULT_MATCHING_WEIGHTS,
    UNIT_TO_KG,
    toCanonicalKg,
    scoreQuality,
    evaluateIndustryCompatibility
};
