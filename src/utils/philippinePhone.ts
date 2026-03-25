export const PHILIPPINES_DIAL_CODE = '+63';
export const PHILIPPINES_LOCAL_PHONE_LENGTH = 11;
export const PHILIPPINES_PHONE_PLACEHOLDER = '09123456789';

export function sanitizePhilippinePhoneNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, '');

  if (digitsOnly.startsWith('63')) {
    return `0${digitsOnly.slice(2)}`.slice(0, PHILIPPINES_LOCAL_PHONE_LENGTH);
  }

  if (digitsOnly.startsWith('9')) {
    return `0${digitsOnly}`.slice(0, PHILIPPINES_LOCAL_PHONE_LENGTH);
  }

  return digitsOnly.slice(0, PHILIPPINES_LOCAL_PHONE_LENGTH);
}

export function isValidPhilippinePhoneNumber(value: string) {
  return /^09\d{9}$/.test(sanitizePhilippinePhoneNumber(value));
}

export function formatPhilippinePhoneNumber(value: string) {
  const sanitized = sanitizePhilippinePhoneNumber(value);
  if (!sanitized) return '';

  return sanitized.startsWith('0')
    ? `${PHILIPPINES_DIAL_CODE} ${sanitized.slice(1)}`
    : `${PHILIPPINES_DIAL_CODE} ${sanitized}`;
}

export function getPhilippinePhoneValidationMessage() {
  return 'Enter a valid Philippine mobile number with 11 digits, starting with 09.';
}
