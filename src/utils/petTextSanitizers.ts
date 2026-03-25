function isLetterOrNumber(char: string) {
  return /[\p{L}\p{N}]/u.test(char);
}

function sanitizeAllowedInput(value: string, options?: { multiline?: boolean; allowComma?: boolean }) {
  const multiline = options?.multiline ?? false;
  const allowComma = options?.allowComma ?? false;

  return Array.from(value).filter((char) => (
    isLetterOrNumber(char)
    || char === ' '
    || char === '.'
    || char === '-'
    || (allowComma && char === ',')
    || (multiline && (char === '\n' || char === '\r'))
  )).join('');
}

export function sanitizePetTextInput(value: string, multiline = false, allowComma = false) {
  return sanitizeAllowedInput(value, { multiline, allowComma });
}

export function sanitizePetAddressInput(value: string, multiline = false) {
  return sanitizeAllowedInput(value, { multiline, allowComma: true });
}

export function sanitizePetPhoneInput(value: string) {
  return Array.from(value).filter((char) => (
    /[0-9]/.test(char)
    || char === ' '
    || char === '.'
    || char === '-'
  )).join('');
}
