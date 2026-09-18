/**
 * ── Campus Geofence Configuration ────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all geofence defaults.
 *
 * Change values HERE and the entire system updates.
 * No need to touch controllers, routes, or frontend code.
 *
 * Directions use compass bearing:
 *   0° = North, 90° = East, 180° = South, 270° = West
 *
 * Per-sector angle ranges (45° each side of cardinal direction):
 *   North: 315°–360° and 0°–45°
 *   East:  45°–135°
 *   South: 135°–225°
 *   West:  225°–315°
 */

const GEOFENCE = {
  defaults: {
    north: 30,
    south: 200,
    east: 100,
    west: 100,
    radius: 100,
  },
  sectors: {
    north: { min: 315, max: 360, min2: 0, max2: 45 },
    east:  { min: 45,  max: 135 },
    south: { min: 135, max: 225 },
    west:  { min: 225, max: 315 },
  },
  maxAccuracyTolerance: 150,
};

export default GEOFENCE;
