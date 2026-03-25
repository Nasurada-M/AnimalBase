const WEIGHT_VALUE_PATTERN = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(?:kg)?\s*$/i;

function normalizeNumericWeight(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, '');
  if (!sanitized) return '';

  const firstDotIndex = sanitized.indexOf('.');
  const normalized = firstDotIndex >= 0
    ? `${sanitized.slice(0, firstDotIndex + 1)}${sanitized.slice(firstDotIndex + 1).replace(/\./g, '')}`
    : sanitized;

  return normalized.startsWith('.') ? `0${normalized}` : normalized;
}

export function getWeightInputValue(value?: string | null) {
  if (!value) return '';

  const trimmed = value.trim();
  const match = trimmed.match(WEIGHT_VALUE_PATTERN);

  return normalizeNumericWeight(match?.[1] ?? trimmed);
}

export function formatWeightForStorage(value?: string | null) {
  const normalized = getWeightInputValue(value).replace(/\.$/, '');
  return normalized ? `${normalized} kg` : '';
}

export function formatWeightForDisplay(value?: string | null, fallback = '-') {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  if (WEIGHT_VALUE_PATTERN.test(trimmed) || /^[\d.\s]+$/.test(trimmed)) {
    return `${getWeightInputValue(trimmed)} kg`;
  }

  return trimmed;
}
