const https = require('https');
const Warehouse = require('../models/warehouse.model');

// In-memory cache with 5-minute TTL
const geoCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const item = geoCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    geoCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  geoCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

function fetchHttpsJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'InventoryEcommerceApp/1.0 (support@inventoryapp.com; contact@inventoryapp.com)',
        Accept: 'application/json'
      },
      timeout: 8000
    };
    const req = https.get(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (err) {
          reject(new Error('Failed to parse geocoder response: ' + body.slice(0, 100)));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Geocoder request timed out'));
    });
  });
}

// Default regional platform fulfillment hubs with coordinates
const DEFAULT_PLATFORM_HUBS = [
  {
    code: 'HUB-GNT-01',
    name: 'Guntur - Amaravati Regional Logistics Hub',
    area: 'Autonagar Industrial Corridor',
    city: 'Guntur',
    state: 'Andhra Pradesh',
    pincode: '522001',
    lat: 16.3067,
    lng: 80.4365
  },
  {
    code: 'HUB-VJA-01',
    name: 'Vijayawada Central Logistics Park',
    area: 'Gannavaram Hub',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '521101',
    lat: 16.5350,
    lng: 80.7950
  },
  {
    code: 'HUB-VIZ-01',
    name: 'Visakhapatnam MVP Express Hub',
    area: 'MVP Colony',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530017',
    lat: 17.7423,
    lng: 83.3342
  },
  {
    code: 'HUB-HYD-01',
    name: 'Hyderabad HITEC City Hub',
    area: 'Madhapur / HITEC City',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    lat: 17.4435,
    lng: 78.3772
  },
  {
    code: 'HUB-BLR-01',
    name: 'Bangalore Koramangala Hub',
    area: 'Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    lat: 12.9352,
    lng: 77.6245
  },
  {
    code: 'HUB-CHE-01',
    name: 'Chennai Guindy Central Hub',
    area: 'Guindy',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600032',
    lat: 13.0067,
    lng: 80.2023
  },
  {
    code: 'HUB-MUM-01',
    name: 'Mumbai Andheri Hub',
    area: 'Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400069',
    lat: 19.1136,
    lng: 72.8697
  },
  {
    code: 'HUB-DEL-01',
    name: 'Delhi NCR Okhla Hub',
    area: 'Okhla Phase III',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110020',
    lat: 28.5355,
    lng: 77.2732
  }
];

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ---------------------------------------------------------------------------
// PHOTON (Komoot OSM) Implementation
// ---------------------------------------------------------------------------
async function searchPhoton(query) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en`;
  const data = await fetchHttpsJson(url);
  if (!data?.features || !Array.isArray(data.features)) return [];

  return data.features.map((f, idx) => {
    const p = f.properties || {};
    const coords = f.geometry?.coordinates || [83.32, 17.72];
    const lng = parseFloat(coords[0]);
    const lat = parseFloat(coords[1]);

    const name = p.name || p.street || p.city || 'Location';
    const area = p.locality || p.suburb || p.district || p.county || '';
    const city = p.city || p.county || p.town || '';
    const state = p.state || '';
    const pincode = p.postcode || '';

    const hierarchyParts = [area, city, state, pincode, 'India']
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const displayName = name && hierarchyParts.length > 0
      ? `${name}, ${hierarchyParts.join(', ')}`
      : (name || hierarchyParts.join(', '));

    return {
      placeId: p.osm_id || `photon_${idx}_${Date.now()}`,
      name,
      displayName,
      formattedAddress: displayName,
      lat,
      lng,
      house: p.housenumber || '',
      area,
      city,
      state,
      pincode,
      addressLine1: [p.housenumber, p.street || area].filter(Boolean).join(', ') || name,
      type: p.osm_value || p.type || 'place'
    };
  });
}

async function reversePhoton(lat, lng) {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`;
  const data = await fetchHttpsJson(url);
  if (!data?.features || !data.features.length) {
    throw new Error('No Photon reverse result');
  }

  const f = data.features[0];
  const p = f.properties || {};
  const name = p.name || p.street || '';
  const area = p.locality || p.suburb || p.district || p.county || '';
  const city = p.city || p.county || p.town || '';
  const state = p.state || '';
  const pincode = p.postcode || '';

  const hierarchy = [name, area, city, state, pincode, 'India']
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return {
    displayName: hierarchy,
    formattedAddress: hierarchy,
    house: p.housenumber || '',
    area,
    city,
    state,
    pincode,
    country: p.country || 'India',
    addressLine1: [p.housenumber, p.street || area].filter(Boolean).join(', ') || name || area || 'Main Road',
    addressLine2: area,
    coordinates: { lat, lng }
  };
}

// ---------------------------------------------------------------------------
// NOMINATIM (Standard OpenStreetMap) Implementation
// ---------------------------------------------------------------------------
async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=8&countrycodes=in`;
  const data = await fetchHttpsJson(url);
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const addr = item.address || {};
    const house = addr.house_number || addr.building || '';
    const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
    const state = addr.state || '';
    const pincode = addr.postcode || '';
    const name = item.display_name.split(',')[0].trim();

    return {
      placeId: item.place_id,
      name,
      displayName: item.display_name,
      formattedAddress: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      house,
      area,
      city,
      state,
      pincode,
      addressLine1: [house, area || addr.road].filter(Boolean).join(', ') || addr.road || area || name,
      type: item.type || 'place'
    };
  });
}

async function reverseNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const data = await fetchHttpsJson(url);

  const addr = data.address || {};
  const house = addr.house_number || addr.building || '';
  const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
  const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
  const state = addr.state || '';
  const pincode = addr.postcode || '';

  return {
    displayName: data.display_name || '',
    formattedAddress: data.display_name || '',
    house,
    area,
    city,
    state,
    pincode,
    country: addr.country || 'India',
    addressLine1: [house, area || addr.road].filter(Boolean).join(', ') || addr.road || area || 'Main Road',
    addressLine2: addr.suburb && addr.suburb !== area ? addr.suburb : (addr.neighbourhood || ''),
    coordinates: {
      lat,
      lng
    }
  };
}

// ---------------------------------------------------------------------------
// PUBLIC EXPORTS
// ---------------------------------------------------------------------------

/**
 * Reverse Geocode: Lat, Lng -> Address
 * Defaults to Photon for instant response, auto-fails over to Nominatim
 */
exports.reverseGeocode = async (lat, lng, provider = 'photon') => {
  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);

  if (isNaN(numericLat) || isNaN(numericLng)) {
    throw new Error('Valid latitude and longitude are required.');
  }

  const cacheKey = `rev_${provider}_${numericLat.toFixed(4)}_${numericLng.toFixed(4)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result = null;

  if (provider === 'nominatim') {
    try {
      result = await reverseNominatim(numericLat, numericLng);
    } catch (err) {
      console.warn('Nominatim reverse failed, falling back to Photon:', err.message);
      result = await reversePhoton(numericLat, numericLng);
    }
  } else {
    try {
      result = await reversePhoton(numericLat, numericLng);
    } catch (err) {
      console.warn('Photon reverse failed, falling back to Nominatim:', err.message);
      result = await reverseNominatim(numericLat, numericLng);
    }
  }

  if (!result) {
    result = await reverseNominatim(numericLat, numericLng);
  }

  setCached(cacheKey, result);
  return result;
};

/**
 * Place Search / Autocomplete: Query -> Standardized Place List
 * Defaults to Photon with Nominatim fallback
 */
exports.searchLocation = async (query, provider = 'photon') => {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return [];

  const cacheKey = `search_${provider}_${q.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let results = [];

  if (provider === 'nominatim') {
    try {
      results = await searchNominatim(q);
    } catch (err) {
      console.warn('Nominatim search failed, falling back to Photon:', err.message);
      results = await searchPhoton(q).catch(() => []);
    }
  } else {
    try {
      results = await searchPhoton(q);
    } catch (err) {
      console.warn('Photon search failed, falling back to Nominatim:', err.message);
      results = await searchNominatim(q).catch(() => []);
    }
  }

  if ((!results || results.length === 0) && provider === 'nominatim') {
    results = await searchPhoton(q).catch(() => []);
  }

  setCached(cacheKey, results);
  return results;
};

/**
 * Auto-seed Platform Warehouses if Database has 0 active warehouses or missing coordinates
 */
exports.seedWarehousesIfEmpty = async () => {
  try {
    // 0. Remove any dummy or artificial local hubs that may have been seeded
    await Warehouse.deleteMany({
      code: { $in: ['HUB-VNK-01', 'HUB-VZM-01', 'HUB-VIZ-02'] }
    });

    // 1. Update existing warehouses with real GPS coordinates
    const geoUpdates = {
      'WH-BLR-01': { lat: 12.9698, lng: 77.7500 },
      'WH-HYD-01': { lat: 17.4401, lng: 78.3489 },
      'WH-MUM-01': { lat: 19.2969, lng: 73.0631 },
      'WH-BOM-02': { lat: 19.2969, lng: 73.0631 },
      'WH-DEL-03': { lat: 28.4595, lng: 77.0266 },
      'WH-HYD-04': { lat: 17.2403, lng: 78.4294 }
    };
    for (const [code, coords] of Object.entries(geoUpdates)) {
      await Warehouse.updateOne({ code }, { $set: { coordinates: coords } });
    }

    // 2. Ensure all regional hubs exist
    for (const h of DEFAULT_PLATFORM_HUBS) {
      const existing = await Warehouse.findOne({ code: h.code });
      if (!existing) {
        await Warehouse.create({
          code: h.code,
          name: h.name,
          location: h.area,
          address: `${h.area}, ${h.city}`,
          city: h.city,
          state: h.state,
          pincode: h.pincode,
          coordinates: { lat: h.lat, lng: h.lng },
          capacity: 15000,
          isActive: true
        });
      } else if (!existing.coordinates?.lat) {
        await Warehouse.updateOne({ _id: existing._id }, { $set: { coordinates: { lat: h.lat, lng: h.lng } } });
      }
    }
    console.log('[WarehouseService] Platform warehouses & regional hubs synchronized with real coordinates.');
  } catch (err) {
    console.warn('[WarehouseService] Warehouse sync error:', err.message);
  }
};

/**
 * Get Available Regional Hubs
 */
exports.getAllHubs = async () => {
  try {
    const dbWarehouses = await Warehouse.find({
      isActive: true,
      isDeleted: { $ne: true },
      code: { $nin: ['HUB-VNK-01', 'HUB-VZM-01', 'HUB-VIZ-02'] }
    }).lean();
    const validDb = dbWarehouses
      .filter((w) => w.coordinates && (w.coordinates.lat || w.coordinates.lng))
      .map((w) => ({
        code: w.code,
        name: w.name,
        area: w.location || w.address || '',
        city: w.city || '',
        state: w.state || '',
        pincode: w.pincode || '',
        lat: w.coordinates.lat,
        lng: w.coordinates.lng
      }));
    if (validDb.length > 0) return validDb;
  } catch (e) {}

  return DEFAULT_PLATFORM_HUBS;
};

const KNOWN_REGIONAL_COORDS = {
  // Cities & Towns
  'guntur': { lat: 16.3067, lng: 80.4365, city: 'Guntur', state: 'Andhra Pradesh' },
  'vinukonda': { lat: 16.0538, lng: 79.7428, city: 'Vinukonda', state: 'Andhra Pradesh' },
  'denkada': { lat: 18.0833, lng: 83.4500, city: 'Denkada', state: 'Andhra Pradesh' },
  'vizianagaram': { lat: 18.1067, lng: 83.3956, city: 'Vizianagaram', state: 'Andhra Pradesh' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  'vizag': { lat: 17.6868, lng: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  'vijayawada': { lat: 16.5062, lng: 80.6480, city: 'Vijayawada', state: 'Andhra Pradesh' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
  'chennai': { lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu' },
  'mumbai': { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
  'delhi': { lat: 28.6139, lng: 77.2090, city: 'New Delhi', state: 'Delhi' },
  'new delhi': { lat: 28.6139, lng: 77.2090, city: 'New Delhi', state: 'Delhi' },
  'gurugram': { lat: 28.4595, lng: 77.0266, city: 'Gurugram', state: 'Haryana' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, city: 'Gurugram', state: 'Haryana' },
  // Common Postal Codes
  '522001': { lat: 16.3067, lng: 80.4365, city: 'Guntur' },
  '522002': { lat: 16.3067, lng: 80.4365, city: 'Guntur' },
  '522004': { lat: 16.2915, lng: 80.4542, city: 'Guntur' },
  '522660': { lat: 16.0538, lng: 79.7428, city: 'Vinukonda' },
  '535003': { lat: 18.1067, lng: 83.3956, city: 'Vizianagaram' },
  '535006': { lat: 18.0833, lng: 83.4500, city: 'Denkada' },
  '530017': { lat: 17.7423, lng: 83.3342, city: 'Visakhapatnam' },
  '530026': { lat: 17.6900, lng: 83.2100, city: 'Visakhapatnam' },
  '520010': { lat: 16.5062, lng: 80.6480, city: 'Vijayawada' },
  '500081': { lat: 17.4435, lng: 78.3772, city: 'Hyderabad' },
  '500032': { lat: 17.4401, lng: 78.3489, city: 'Hyderabad' },
  '560034': { lat: 12.9352, lng: 77.6245, city: 'Bengaluru' },
  '560001': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru' },
  '560066': { lat: 12.9698, lng: 77.7500, city: 'Bengaluru' },
  '600032': { lat: 13.0067, lng: 80.2023, city: 'Chennai' },
  '400069': { lat: 19.1136, lng: 72.8697, city: 'Mumbai' },
  '421302': { lat: 19.2969, lng: 73.0631, city: 'Mumbai' },
  '110020': { lat: 28.5355, lng: 77.2732, city: 'New Delhi' },
  '122001': { lat: 28.4595, lng: 77.0266, city: 'Gurugram' },
  '123444': { lat: 28.3180, lng: 76.6190, city: 'Haryana' },
  '324566': { lat: 25.1800, lng: 75.8300, city: 'Rajasthan' },
  '123228': { lat: 28.2500, lng: 76.6000, city: 'Haryana' }
};

/**
 * Resolves real coordinates from given inputs (lat/lng, pincode, city, area).
 * Strictly avoids artificial dummy fallbacks so distance is always authentic.
 */
async function resolveLocationCoordinates(lat, lng, customerArea = '', customerCity = '', customerPincode = '') {
  let numericLat = parseFloat(lat);
  let numericLng = parseFloat(lng);

  // If coordinates are valid and non-zero
  if (!isNaN(numericLat) && !isNaN(numericLng) && !(numericLat === 0 && numericLng === 0)) {
    return { lat: numericLat, lng: numericLng };
  }

  const cleanPincode = String(customerPincode || '').trim();
  const cleanCity = String(customerCity || '').trim().toLowerCase();
  const cleanArea = String(customerArea || '').trim().toLowerCase();

  // 1. Check known pincode registry
  if (cleanPincode && KNOWN_REGIONAL_COORDS[cleanPincode]) {
    return {
      lat: KNOWN_REGIONAL_COORDS[cleanPincode].lat,
      lng: KNOWN_REGIONAL_COORDS[cleanPincode].lng
    };
  }

  // 2. Check known city registry
  if (cleanCity && KNOWN_REGIONAL_COORDS[cleanCity]) {
    return {
      lat: KNOWN_REGIONAL_COORDS[cleanCity].lat,
      lng: KNOWN_REGIONAL_COORDS[cleanCity].lng
    };
  }

  // 3. Check known area registry
  if (cleanArea && KNOWN_REGIONAL_COORDS[cleanArea]) {
    return {
      lat: KNOWN_REGIONAL_COORDS[cleanArea].lat,
      lng: KNOWN_REGIONAL_COORDS[cleanArea].lng
    };
  }

  // 4. Dynamic Geocode lookup via Photon
  try {
    const searchTarget = cleanPincode ? `${cleanPincode}, India` : `${customerCity || customerArea}, India`;
    if (searchTarget.length > 5) {
      const results = await exports.searchLocation(searchTarget);
      if (results && results.length > 0 && results[0].lat && results[0].lng) {
        return { lat: Number(results[0].lat), lng: Number(results[0].lng) };
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Real-Time Geodesic Delivery Estimation Engine
 * Calculates authentic geodesic distance (Haversine) from customer coordinates
 * to the nearest active fulfillment warehouse.
 * Accurately determines express eligibility and dynamic ETA (max 2 days per cron).
 */
exports.getNearestHub = async (lat, lng, customerArea = '', customerCity = '', maxRadiusKm = 100, customerPincode = '', preferredHub = '') => {
  const radius = Math.max(parseFloat(maxRadiusKm) || 100, 2);

  // Authentically resolve coordinates without false defaults
  const coords = await resolveLocationCoordinates(lat, lng, customerArea, customerCity, customerPincode);

  const now = new Date();
  const dateOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const formatted2Days = twoDaysLater.toLocaleDateString('en-IN', dateOptions);

  if (!coords) {
    return {
      eligible: false,
      isExpress: false,
      fastDeliveryAvailable: false,
      distanceKm: null,
      deliveryDays: 2,
      deliveryDate: formatted2Days,
      deliveryWindow: `📦 Standard Delivery • Within 2 Days (${formatted2Days})`,
      speedLabel: 'Standard',
      hubName: 'Regional Distribution Center',
      hubCity: customerCity || 'Central',
      freeDelivery: true,
      codAvailable: true,
      maxDays: 2
    };
  }

  const hubs = await exports.getAllHubs();
  let nearest = null;
  let minDistance = Infinity;

  // If a specific preferred logistics hub is chosen, prioritize it
  if (preferredHub && preferredHub !== 'auto' && preferredHub !== 'all') {
    const matched = hubs.find(
      (h) =>
        h.code === preferredHub ||
        h.name.toLowerCase().includes(preferredHub.toLowerCase()) ||
        h.city.toLowerCase() === preferredHub.toLowerCase()
    );
    if (matched) {
      nearest = matched;
      minDistance = calculateDistanceKm(coords.lat, coords.lng, matched.lat, matched.lng);
    }
  }

  if (!nearest) {
    hubs.forEach((hub) => {
      const dist = calculateDistanceKm(coords.lat, coords.lng, hub.lat, hub.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = hub;
      }
    });
  }

  const roundedDistance = Math.round(minDistance * 10) / 10;
  // Strictly eligible ONLY if genuine distance is within configured radius and capped at 100 km!
  // Locations > 100 km away (or 300+ km away without regional hubs) strictly evaluate to false!
  const maxAllowedRadius = Math.min(radius, 100);
  const isEligible = roundedDistance <= maxAllowedRadius;

  let deliveryDays = 2;
  let deliveryDate = formatted2Days;
  let deliveryWindow = `📦 Standard Delivery • Within 2 Days (${formatted2Days})`;
  let speedLabel = 'Standard';

  if (isEligible) {
    const currentHour = now.getHours();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formattedTomorrow = `Tomorrow (${tomorrow.toLocaleDateString('en-IN', dateOptions)})`;
    const formattedToday = `Today (${now.toLocaleDateString('en-IN', dateOptions)})`;

    if (roundedDistance <= 10) {
      // Tier 1: Local / Hyperlocal Express (<= 10 km)
      if (currentHour < 20) {
        deliveryDays = 0;
        deliveryDate = formattedToday;
        if (roundedDistance <= 3) {
          deliveryWindow = '⚡ Ultra-Fast Express • 30-45 Mins';
          speedLabel = '30 mins';
        } else {
          deliveryWindow = '⚡ Express Delivery • Under 2 Hours';
          speedLabel = 'Under 2h';
        }
      } else {
        deliveryDays = 1;
        deliveryDate = formattedTomorrow;
        deliveryWindow = '⚡ Express Delivery • Tomorrow by 10:00 AM';
        speedLabel = 'Next-Day';
      }
    } else if (roundedDistance <= 50) {
      // Tier 2: Metro / Intra-City Corridor Express (10 km - 50 km)
      if (currentHour < 14) {
        deliveryDays = 0;
        deliveryDate = formattedToday;
        deliveryWindow = '⚡ Same-Day Express • Today by 8:00 PM';
        speedLabel = 'Same-Day';
      } else {
        deliveryDays = 1;
        deliveryDate = formattedTomorrow;
        deliveryWindow = '⚡ Express Delivery • Tomorrow by 1:00 PM';
        speedLabel = 'Next-Day';
      }
    } else if (roundedDistance <= 100) {
      // Tier 3: Regional Express Corridor (50 km - 100 km, e.g. Vinukonda ~79.3 km from Guntur Hub)
      deliveryDays = 1;
      deliveryDate = formattedTomorrow;
      deliveryWindow = '⚡ Regional Express • Tomorrow by 1:00 PM (Within 24h)';
      speedLabel = 'Next-Day';
    }
  }

  return {
    eligible: isEligible,
    isExpress: isEligible,
    fastDeliveryAvailable: isEligible,
    distanceKm: roundedDistance,
    deliveryDays,
    deliveryDate,
    deliveryWindow,
    speedLabel,
    hubName: nearest?.name || 'Regional Fulfillment Hub',
    hubCity: nearest?.city || customerCity || 'Local',
    hubArea: nearest?.area || customerArea || '',
    nearestHub: nearest,
    freeDelivery: true,
    codAvailable: true,
    radiusKm: radius,
    maxDays: 2
  };
};
