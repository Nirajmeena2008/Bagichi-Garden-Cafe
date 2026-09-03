// Google Maps Platform & Location Assistance Service
// Usage Attribution ID: gmp_mcp_codeassist_v1_aistudio

export interface CustomerLocationData {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  formattedAddress: string;
  street?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  googleMapsUrl: string;
  source: 'gps_google_maps' | 'gps_reverse_geo' | 'manual';
}

/**
 * Attempt to reverse geocode coordinates using Google Maps Geocoding REST API if key is present
 */
async function reverseGeocodeWithGoogle(lat: number, lng: number, apiKey: string): Promise<Partial<CustomerLocationData> | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const best = data.results[0];
      let street = '';
      let locality = '';
      let city = 'Jaipur';
      let state = 'Rajasthan';
      let pincode = '';

      for (const comp of best.address_components || []) {
        if (comp.types.includes('route') || comp.types.includes('street_address')) {
          street = comp.long_name;
        }
        if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
          locality = comp.long_name;
        }
        if (comp.types.includes('locality')) {
          city = comp.long_name;
        }
        if (comp.types.includes('administrative_area_level_1')) {
          state = comp.long_name;
        }
        if (comp.types.includes('postal_code')) {
          pincode = comp.long_name;
        }
      }

      return {
        formattedAddress: best.formatted_address,
        street,
        locality,
        city,
        state,
        pincode,
        source: 'gps_google_maps'
      };
    }
  } catch (err) {
    console.warn('[LocationService] Google Maps Geocoding API call error:', err);
  }
  return null;
}

/**
 * Fallback open reverse geocoding to guarantee instant zero-setup location resolution
 */
async function reverseGeocodeFallback(lat: number, lng: number): Promise<Partial<CustomerLocationData>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-IN,en;q=0.9',
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.suburb || '';
      const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || '';
      const city = addr.city || addr.town || addr.village || addr.state_district || 'Jaipur';
      const state = addr.state || 'Rajasthan';
      const postcode = addr.postcode || '';

      const addressParts = [
        addr.house_number || addr.building,
        road,
        neighbourhood,
        city,
        postcode ? `PIN ${postcode}` : null,
        state
      ].filter(Boolean);

      const formatted = addressParts.length > 0 ? addressParts.join(', ') : (data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

      return {
        formattedAddress: formatted,
        street: road,
        locality: neighbourhood,
        city,
        state,
        pincode: postcode,
        source: 'gps_reverse_geo'
      };
    }
  } catch (err) {
    console.warn('[LocationService] Fallback reverse geocoding error:', err);
  }

  // Graceful coordinate default
  return {
    formattedAddress: `Location near (${lat.toFixed(4)}, ${lng.toFixed(4)}), Jaipur, Rajasthan`,
    city: 'Jaipur',
    state: 'Rajasthan',
    source: 'gps_reverse_geo'
  };
}

/**
 * Request device location via browser Geolocation API and auto-resolve human-readable address
 */
export async function getCurrentCustomerLocation(): Promise<CustomerLocationData> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        const gmpApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        let geocoded: Partial<CustomerLocationData> | null = null;

        if (gmpApiKey) {
          geocoded = await reverseGeocodeWithGoogle(lat, lng, gmpApiKey);
        }

        if (!geocoded) {
          geocoded = await reverseGeocodeFallback(lat, lng);
        }

        resolve({
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
          formattedAddress: geocoded.formattedAddress || `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
          street: geocoded.street || '',
          locality: geocoded.locality || '',
          city: geocoded.city || 'Jaipur',
          state: geocoded.state || 'Rajasthan',
          pincode: geocoded.pincode || '',
          googleMapsUrl,
          source: geocoded.source || 'gps_google_maps'
        });
      },
      (error) => {
        let msg = 'Unable to fetch your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can enter your delivery address manually below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location signal is unavailable. Please type your delivery address manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again or type address manually.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000
      }
    );
  });
}
