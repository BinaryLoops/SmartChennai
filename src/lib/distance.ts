/**
 * Calculates the great-circle distance between two points on a sphere
 * given their longitudes and latitudes.
 *
 * @param lat1 Latitude of the first point in degrees
 * @param lng1 Longitude of the first point in degrees
 * @param lat2 Latitude of the second point in degrees
 * @param lng2 Longitude of the second point in degrees
 * @returns Distance in kilometers
 */
export function getHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;

  const R = 6371; // Earth radius in km

  const dLat = toRadian(lat2 - lat1);
  const dLng = toRadian(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadian(lat1)) *
      Math.cos(toRadian(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
