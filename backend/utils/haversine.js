/**
 * Haversine Distance Formula Utility
 * Calculates the great-circle distance between two geographical coordinates on Earth.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Validates whether latitude and longitude are valid decimal numbers within proper bounds.
 * @param {number} lat - Latitude in degrees (-90 to +90)
 * @param {number} lon - Longitude in degrees (-180 to +180)
 * @returns {boolean}
 */
function isValidCoordinate(lat, lon) {
    if (lat === null || lat === undefined || lon === null || lon === undefined) return false;
    const numLat = Number(lat);
    const numLon = Number(lon);
    if (Number.isNaN(numLat) || Number.isNaN(numLon)) return false;
    return numLat >= -90 && numLat <= 90 && numLon >= -180 && numLon <= 180;
}

/**
 * Converts degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
function toRadians(deg) {
    return (deg * Math.PI) / 180;
}

/**
 * Calculates great-circle distance between two points on a sphere using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers, rounded to 2 decimal places.
 * @throws {Error} if coordinates are invalid.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
        throw new Error(`Invalid geographic coordinates: (${lat1}, ${lon1}) and (${lat2}, ${lon2})`);
    }

    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    // Exact identical coordinates check (avoids floating point drift)
    if (nLat1 === nLat2 && nLon1 === nLon2) {
        return 0.0;
    }

    const phi1 = toRadians(nLat1);
    const phi2 = toRadians(nLat2);
    const deltaPhi = toRadians(nLat2 - nLat1);
    const deltaLambda = toRadians(nLon2 - nLon1);

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    // Clamp 'a' to [0, 1] to prevent floating point inaccuracies resulting in NaN for antipodal points
    const clampedA = Math.min(Math.max(a, 0), 1);
    const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

    const distance = EARTH_RADIUS_KM * c;
    return Math.round(distance * 100) / 100;
}

module.exports = {
    EARTH_RADIUS_KM,
    isValidCoordinate,
    calculateHaversineDistance
};
