const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_USER_AGENT = 'AnimalBase/1.0 (geolocation support)';
const REQUEST_TIMEOUT_MS = 4000;

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

module.exports = {
  normalizeText,
  parseCoordinatePair,
  reverseGeocodeCoordinates,
};
