/**
 * LocationService
 * Provides geocoding utilities using the OpenStreetMap Nominatim API.
 * It resolves a textual address to latitude and longitude.
 */
// Using built‑in fetch, no external dependency needed

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export class LocationService {
  /**
   * Geocode an address string using Nominatim.
   * @param address Human readable address.
   * @returns Promise resolving to latitude/longitude.
   * @throws Error if no result found.
   */
  static async geocode(address: string): Promise<GeoCoordinates> {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
    });
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CareHive-Backend/1.0 (support@carehive.med)',
      },
    });
    if (!response.ok) {
      throw new Error(`Geocoding request failed with status ${response.status}`);
    }
    const data = (await response.json()) as any[];
    if (!data.length) {
      throw new Error('No geocoding results found for the given address');
    }
    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
  }
}
