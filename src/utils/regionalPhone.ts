export type PhoneRegion = {
  code: string;
  label: string;
  dialCode: string;
  minLocalDigits: number;
  maxLocalDigits: number;
  placeholder: string;
  dropLeadingZero?: boolean;
};

export const PHONE_REGIONS: PhoneRegion[] = [
  {
    code: 'PH',
    label: 'Philippines',
    dialCode: '+63',
    minLocalDigits: 10,
    maxLocalDigits: 11,
    placeholder: '09123456789',
    dropLeadingZero: true,
  },
  {
    code: 'SG',
    label: 'Singapore',
    dialCode: '+65',
    minLocalDigits: 8,
    maxLocalDigits: 8,
    placeholder: '81234567',
  },
  {
    code: 'US',
    label: 'United States',
    dialCode: '+1',
    minLocalDigits: 10,
    maxLocalDigits: 10,
    placeholder: '2015550123',
  },
  {
    code: 'CA',
    label: 'Canada',
    dialCode: '+1',
    minLocalDigits: 10,
    maxLocalDigits: 10,
    placeholder: '4165550123',
  },
  {
    code: 'GB',
    label: 'United Kingdom',
    dialCode: '+44',
    minLocalDigits: 10,
    maxLocalDigits: 11,
    placeholder: '07123456789',
    dropLeadingZero: true,
  },
  {
    code: 'AU',
    label: 'Australia',
    dialCode: '+61',
    minLocalDigits: 9,
    maxLocalDigits: 10,
    placeholder: '0412345678',
    dropLeadingZero: true,
  },
];

export const DEFAULT_PHONE_REGION_CODE = 'PH';

export const getPhoneRegion = (code: string) =>
  PHONE_REGIONS.find(region => region.code === code) ?? PHONE_REGIONS[0];

export const sanitizeLocalPhoneNumber = (value: string, region: PhoneRegion) =>
  value.replace(/\D/g, '').slice(0, region.maxLocalDigits);

export const isRegionalPhoneValid = (value: string, region: PhoneRegion) =>
  value.length >= region.minLocalDigits && value.length <= region.maxLocalDigits;

export const formatRegionalPhoneNumber = (value: string, region: PhoneRegion) => {
  const sanitized = sanitizeLocalPhoneNumber(value, region);
  if (!sanitized) return '';
  const withoutTrunkPrefix =
    region.dropLeadingZero && sanitized.startsWith('0') ? sanitized.slice(1) : sanitized;
  return `${region.dialCode} ${withoutTrunkPrefix}`;
};

export const getRegionalPhoneValidationMessage = (region: PhoneRegion) =>
  region.minLocalDigits === region.maxLocalDigits
    ? `Enter a valid ${region.label} number with ${region.maxLocalDigits} digits.`
    : `Enter a valid ${region.label} number with ${region.minLocalDigits}-${region.maxLocalDigits} digits.`;
