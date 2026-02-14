/**
 * Géocodage via OpenStreetMap Nominatim (gratuit, sans clé API).
 * Remplace l'ancienne utilisation de Mapbox Geocoding.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'TapTapGo/1.0 (ride-hailing; contact@taptapgo.app)',
};

export type GeocodingResult = { label: string; lat: number; lng: number };

/**
 * Recherche d'adresses (autocomplete / suggestions).
 */
export async function searchAddress(
  query: string,
  options?: { limit?: number; proximityLng?: number; proximityLat?: number }
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: String(options?.limit ?? 6),
    addressdetails: '1',
  });
  if (options?.proximityLat != null && options?.proximityLng != null) {
    params.set('viewbox', [
      options.proximityLng - 0.05,
      options.proximityLat - 0.05,
      options.proximityLng + 0.05,
      options.proximityLat + 0.05,
    ].join(','));
    params.set('bounded', '1');
  }

  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;
  const response = await fetch(url, { headers: HEADERS });
  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .filter((item: any) => item.lat && item.lon)
    .map((item: any) => ({
      label: item.display_name || `${item.lat},${item.lon}`,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
}

/**
 * Résoudre une adresse en coordonnées (un seul résultat).
 */
export async function geocodeAddress(
  query: string,
  options?: { proximityLng?: number; proximityLat?: number }
): Promise<{ lat: number; lng: number } | null> {
  const results = await searchAddress(query, { limit: 1, ...options });
  const first = results[0];
  return first ? { lat: first.lat, lng: first.lng } : null;
}
