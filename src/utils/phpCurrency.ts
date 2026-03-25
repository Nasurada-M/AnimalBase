const PHP_SYMBOL = '₱';

export function sanitizePhpAmountInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 12);
}

function normalizePhpAmount(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  const normalizedValue = trimmedValue
    .replace(/PHP/gi, '')
    .replace(/₱/g, '')
    .replace(/,/g, '')
    .trim();

  return /^\d+$/.test(normalizedValue) ? normalizedValue : '';
}

export function formatPhpAmount(amount: string) {
  const normalizedAmount = normalizePhpAmount(amount);
  if (!normalizedAmount) return '';

  const formattedAmount = new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
  }).format(Number(normalizedAmount));

  return `${PHP_SYMBOL} ${formattedAmount}`;
}

export function formatPhpRewardValue(value?: string | null) {
  if (!value?.trim()) return null;

  const formattedValue = formatPhpAmount(value);
  return formattedValue || value.trim();
}
