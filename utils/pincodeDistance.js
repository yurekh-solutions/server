/**
 * Pincode-based distance estimation for Indian postal codes
 * 
 * Indian pincodes are 6 digits:
 * - 1st digit: Region (0-9)
 * - 1st 2 digits: Sub-region/state
 * - 1st 3 digits: Sorting district
 * - Last 3 digits: Specific post office
 * 
 * Distance estimation logic:
 * - Same pincode: 0-2 km
 * - Same first 5 digits: 2-5 km (nearby areas)
 * - Same first 4 digits: 5-10 km (same district area)
 * - Same first 3 digits: 10-25 km (same sorting district)
 * - Same first 2 digits: 25-100 km (same state/region)
 * - Different first 2 digits: 100+ km (different states)
 */

/**
 * Calculate estimated distance between two pincodes
 * @param {string} pincode1 - First pincode (6 digits)
 * @param {string} pincode2 - Second pincode (6 digits)
 * @returns {number} Estimated distance in kilometers
 */
function calculatePincodeDistance(pincode1, pincode2) {
  if (!pincode1 || !pincode2) {
    return null; // Cannot calculate without both pincodes
  }

  // Clean and normalize pincodes
  const p1 = pincode1.toString().trim();
  const p2 = pincode2.toString().trim();

  // Validate pincode format (6 digits)
  if (!/^\d{6}$/.test(p1) || !/^\d{6}$/.test(p2)) {
    return null; // Invalid pincode format
  }

  // Exact same pincode
  if (p1 === p2) {
    return 2; // 0-2 km (within same postal area)
  }

  // First 5 digits match (very close areas)
  if (p1.substring(0, 5) === p2.substring(0, 5)) {
    return 5; // 2-5 km
  }

  // First 4 digits match (nearby areas in same district)
  if (p1.substring(0, 4) === p2.substring(0, 4)) {
    return 10; // 5-10 km
  }

  // First 3 digits match (same sorting district)
  if (p1.substring(0, 3) === p2.substring(0, 3)) {
    return 20; // 10-25 km
  }

  // First 2 digits match (same state/region)
  if (p1.substring(0, 2) === p2.substring(0, 2)) {
    return 50; // 25-100 km
  }

  // Different regions (different states)
  return 150; // 100+ km
}

/**
 * Get distance category label
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Distance category label
 */
function getDistanceCategory(distanceKm) {
  if (distanceKm === null) return 'Unknown';
  if (distanceKm <= 5) return 'Very Close';
  if (distanceKm <= 10) return 'Nearby';
  if (distanceKm <= 25) return 'Local';
  if (distanceKm <= 50) return 'Regional';
  return 'Far';
}

module.exports = {
  calculatePincodeDistance,
  getDistanceCategory,
};
