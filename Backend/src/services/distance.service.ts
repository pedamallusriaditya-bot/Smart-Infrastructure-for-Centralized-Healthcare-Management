/**
 * DistanceService
 * Provides utility to calculate geographical distance between two coordinate points
 * using the Haversine formula. Returns distance in kilometers.
 */
export class DistanceService {
  /**
   * Calculates the great‑circle distance between two points on Earth.
   * @param lat1 Latitude of the first point in decimal degrees.
   * @param lon1 Longitude of the first point in decimal degrees.
   * @param lat2 Latitude of the second point in decimal degrees.
   * @param lon2 Longitude of the second point in decimal degrees.
   * @returns Distance in kilometers.
   */
  static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
