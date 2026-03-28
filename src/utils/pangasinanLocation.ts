const PANGASINAN_REGEX = /\bpangasinan\b/i;

export function isPangasinanLocationValue(value: string) {
  return PANGASINAN_REGEX.test(value.trim());
}

export function getPangasinanLocationValidationMessage(fieldLabel: string) {
  return `${fieldLabel} must be in Pangasinan, Philippines.`;
}
