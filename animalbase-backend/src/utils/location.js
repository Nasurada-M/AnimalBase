const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_GEOCODER_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DEFAULT_USER_AGENT = 'AnimalBase/1.0 (geolocation support)';
const REQUEST_TIMEOUT_MS = 4000;
const PANGASINAN_REGEX = /\bpangasinan\b/i;
const GOOGLE_PLACES_FIELD_MASK = '*';
const ALLOWED_PANGASINAN_SEARCH_TYPES = new Set([
  'administrative',
  'barangay',
  'borough',
  'city',
  'district',
  'hamlet',
  'municipality',
  'neighbourhood',
  'quarter',
  'suburb',
  'town',
  'village',
]);
const ALLOWED_GOOGLE_PANGASINAN_TYPES = new Set([
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'locality',
  'neighborhood',
  'political',
  'postal_town',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'sublocality_level_3',
]);
const PANGASINAN_LOCATION_RESTRICTION = {
  rectangle: {
    low: {
      latitude: 15.74,
      longitude: 119.72,
    },
    high: {
      latitude: 16.57,
      longitude: 121.01,
    },
  },
};

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isPangasinanLocation(value) {
  const normalized = normalizeText(value);
  return Boolean(normalized && PANGASINAN_REGEX.test(normalized));
}

function getGoogleMapsApiKey() {
  return normalizeText(
    process.env.GOOGLE_MAPS_API_KEY
    || process.env.GOOGLE_PLACES_API_KEY
    || process.env.GOOGLE_API_KEY
  );
}

function formatPangasinanSuggestion(result) {
  const address = result?.address || {};
  const primaryName =
    normalizeText(result?.name)
    || normalizeText(address.barangay)
    || normalizeText(address.village)
    || normalizeText(address.hamlet)
    || normalizeText(address.neighbourhood)
    || normalizeText(address.suburb)
    || normalizeText(address.quarter)
    || normalizeText(address.city)
    || normalizeText(address.town)
    || normalizeText(address.municipality)
    || normalizeText(address.county);
  const municipality =
    normalizeText(address.city)
    || normalizeText(address.town)
    || normalizeText(address.municipality)
    || normalizeText(address.county);

  const parts = [primaryName];
  if (municipality && municipality.toLowerCase() !== primaryName?.toLowerCase()) {
    parts.push(municipality);
  }
  parts.push('Pangasinan', 'Philippines');

  return Array.from(new Set(parts.filter(Boolean))).join(', ');
}

function formatPangasinanSuggestionKind(result) {
  const type = normalizeText(result?.addresstype || result?.type)?.toLowerCase();

  switch (type) {
    case 'city':
      return 'City';
    case 'town':
    case 'municipality':
      return 'Municipality';
    case 'barangay':
    case 'village':
    case 'hamlet':
    case 'neighbourhood':
    case 'quarter':
    case 'suburb':
      return 'Barangay';
    default:
      return 'Pangasinan';
  }
}

function buildGooglePredictionLabel(prediction) {
  const mainText = normalizeText(prediction?.structuredFormat?.mainText?.text);
  const secondaryText = normalizeText(prediction?.structuredFormat?.secondaryText?.text);
  const fullText = normalizeText(prediction?.text?.text);

  if (mainText && secondaryText) {
    return `${mainText}, ${secondaryText}`;
  }

  return fullText;
}

function formatGooglePangasinanSuggestionKind(prediction) {
  const types = Array.isArray(prediction?.types)
    ? prediction.types
      .map((type) => normalizeText(type)?.toLowerCase())
      .filter(Boolean)
    : [];

  if (types.includes('locality') || types.includes('postal_town')) {
    return 'City';
  }

  if (
    types.includes('sublocality')
    || types.includes('sublocality_level_1')
    || types.includes('sublocality_level_2')
    || types.includes('sublocality_level_3')
    || types.includes('neighborhood')
  ) {
    return 'Barangay';
  }

  if (
    types.includes('administrative_area_level_3')
    || types.includes('administrative_area_level_4')
    || types.includes('administrative_area_level_5')
  ) {
    return 'Municipality';
  }

  return 'Pangasinan';
}

function isAllowedGooglePangasinanPrediction(prediction) {
  const label = buildGooglePredictionLabel(prediction);
  if (!isPangasinanLocation(label)) {
    return false;
  }

  const types = Array.isArray(prediction?.types)
    ? prediction.types
      .map((type) => normalizeText(type)?.toLowerCase())
      .filter(Boolean)
    : [];

  if (!types.length) {
    return true;
  }

  return types.some((type) => ALLOWED_GOOGLE_PANGASINAN_TYPES.has(type));
}

function isAllowedPangasinanSearchResult(result) {
  const type = normalizeText(result?.addresstype || result?.type)?.toLowerCase();
  if (type && !ALLOWED_PANGASINAN_SEARCH_TYPES.has(type)) {
    return false;
  }

  const address = result?.address || {};
  const searchableLocationText = [
    address.state,
    address.province,
    address.region,
    address.county,
    address.city,
    address.town,
    address.municipality,
    result?.display_name,
  ]
    .filter(Boolean)
    .join(' ');

  return isPangasinanLocation(searchableLocationText);
}

function parseCoordinate(rawValue, options) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`${options.label} must be a valid number.`);
  }

  if (value < options.min || value > options.max) {
    throw new Error(`${options.label} must be between ${options.min} and ${options.max}.`);
  }

  return Number(value.toFixed(7));
}

function parseCoordinatePair(latitudeRaw, longitudeRaw) {
  const latitude = parseCoordinate(latitudeRaw, {
    label: 'Latitude',
    min: -90,
    max: 90,
  });

  const longitude = parseCoordinate(longitudeRaw, {
    label: 'Longitude',
    min: -180,
    max: 180,
  });

  if ((latitude === null) !== (longitude === null)) {
    throw new Error('Latitude and longitude must be provided together.');
  }

  return { latitude, longitude };
}

async function reverseGeocodeCoordinates(latitude, longitude) {
  if (latitude === null || longitude === null || typeof fetch !== 'function') {
    return null;
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const url = new URL(process.env.GEOCODER_REVERSE_URL || DEFAULT_GEOCODER_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': process.env.GEOCODER_USER_AGENT || DEFAULT_USER_AGENT,
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return normalizeText(data?.display_name);
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn('reverseGeocodeCoordinates failed:', err.message);
    }
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function searchPangasinanLocationsWithGoogle(query) {
  const normalizedQuery = normalizeText(query);
  const apiKey = getGoogleMapsApiKey();

  if (!normalizedQuery || normalizedQuery.length < 2 || !apiKey || typeof fetch !== 'function') {
    return null;
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const url = new URL(
      process.env.GOOGLE_PLACES_AUTOCOMPLETE_URL || DEFAULT_GOOGLE_PLACES_AUTOCOMPLETE_URL
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        input: normalizedQuery,
        includedPrimaryTypes: ['(regions)'],
        includedRegionCodes: ['ph'],
        languageCode: 'en',
        locationRestriction: PANGASINAN_LOCATION_RESTRICTION,
        regionCode: 'ph',
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      console.warn(`searchPangasinanLocationsWithGoogle failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    const seenLabels = new Set();

    return suggestions
      .map((entry) => entry?.placePrediction)
      .filter(Boolean)
      .filter(isAllowedGooglePangasinanPrediction)
      .map((prediction) => ({
        label: buildGooglePredictionLabel(prediction),
        kind: formatGooglePangasinanSuggestionKind(prediction),
      }))
      .filter((result) => {
        if (!result.label || seenLabels.has(result.label)) {
          return false;
        }

        seenLabels.add(result.label);
        return true;
      });
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn('searchPangasinanLocationsWithGoogle failed:', err.message);
    }
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function searchPangasinanLocations(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery || normalizedQuery.length < 2 || typeof fetch !== 'function') {
    return [];
  }

  const googleSuggestions = await searchPangasinanLocationsWithGoogle(normalizedQuery);
  if (googleSuggestions !== null) {
    return googleSuggestions;
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const url = new URL(process.env.GEOCODER_SEARCH_URL || DEFAULT_GEOCODER_SEARCH_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'ph');
    url.searchParams.set('limit', '8');
    url.searchParams.set('q', `${normalizedQuery}, Pangasinan, Philippines`);

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': process.env.GEOCODER_USER_AGENT || DEFAULT_USER_AGENT,
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    const seenLabels = new Set();

    return data
      .filter(isAllowedPangasinanSearchResult)
      .map((result) => ({
        label: formatPangasinanSuggestion(result),
        kind: formatPangasinanSuggestionKind(result),
      }))
      .filter((result) => {
        if (!result.label || seenLabels.has(result.label)) {
          return false;
        }

        seenLabels.add(result.label);
        return true;
      });
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn('searchPangasinanLocations failed:', err.message);
    }
    return [];
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

module.exports = {
  normalizeText,
  isPangasinanLocation,
  parseCoordinatePair,
  reverseGeocodeCoordinates,
  searchPangasinanLocations,
};
