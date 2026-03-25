import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, ArrowLeft, MapPin, Calendar, Camera, AlertTriangle, Eye,
  CheckCircle2, Upload, X, Loader2, ClipboardList, UserCircle2,
  ArrowUpRight, Mail, Phone,
} from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import ClearableSearchField from '../../components/ClearableSearchField';
import { usePetFinderViewModel } from '../../viewmodels/PetFinderViewModel';
import { ApiLostPet, ApiSighting } from '../../services/api';
import { MissingPetPayload, SightingPayload } from '../../services/api';
import { useAuth } from '../../context/AppContext';
import { sanitizePetAddressInput, sanitizePetTextInput } from '../../utils/petTextSanitizers';
import { formatWeightForDisplay, getWeightInputValue } from '../../utils/petWeight';
import { formatPhpAmount, formatPhpRewardValue, sanitizePhpAmountInput } from '../../utils/phpCurrency';

const MISSING_PET_TYPES = ['Dog', 'Cat', 'Bird', 'Small Animal', 'Reptile', 'Other'];
const AGE_OPTIONS = ['Under 1 year', '1-2 years', '3-5 years', '6-10 years', '10+ years', 'Unknown'];
const SANITIZED_MISSING_FIELDS = new Set([
  'petName',
  'breed',
  'colorAppearance',
  'description',
  'distinctiveFeatures',
]);
const ADDRESS_MISSING_FIELDS = new Set(['lastSeenLocation']);
const MULTILINE_MISSING_FIELDS = new Set(['description', 'distinctiveFeatures']);
const COMMA_MISSING_FIELDS = new Set(['colorAppearance', 'description', 'distinctiveFeatures']);
type CurrencyOption = { code: string; symbol: string };
const DEFAULT_REWARD_CURRENCY = 'PHP';
const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'AED', symbol: 'AED' },
  { code: 'ARS', symbol: 'AR$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'BDT', symbol: '৳' },
  { code: 'BHD', symbol: 'BD' },
  { code: 'BND', symbol: 'B$' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'CLP', symbol: 'CLP$' },
  { code: 'CNY', symbol: 'CN¥' },
  { code: 'COP', symbol: 'COL$' },
  { code: 'CZK', symbol: 'Kč' },
  { code: 'DKK', symbol: 'kr' },
  { code: 'DZD', symbol: 'DA' },
  { code: 'EGP', symbol: 'E£' },
  { code: 'EUR', symbol: '€' },
  { code: 'FJD', symbol: 'FJ$' },
  { code: 'GBP', symbol: '£' },
  { code: 'GHS', symbol: 'GH₵' },
  { code: 'GTQ', symbol: 'Q' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'HUF', symbol: 'Ft' },
  { code: 'IDR', symbol: 'Rp' },
  { code: 'ILS', symbol: '₪' },
  { code: 'INR', symbol: '₹' },
  { code: 'JMD', symbol: 'J$' },
  { code: 'JOD', symbol: 'JD' },
  { code: 'JPY', symbol: '¥' },
  { code: 'KES', symbol: 'KSh' },
  { code: 'KRW', symbol: '₩' },
  { code: 'KWD', symbol: 'KD' },
  { code: 'LKR', symbol: 'Rs' },
  { code: 'MAD', symbol: 'MAD' },
  { code: 'MXN', symbol: 'MX$' },
  { code: 'MYR', symbol: 'RM' },
  { code: 'NGN', symbol: '₦' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'NPR', symbol: 'Rs' },
  { code: 'NZD', symbol: 'NZ$' },
  { code: 'OMR', symbol: 'OMR' },
  { code: 'PEN', symbol: 'S/' },
  { code: 'PHP', symbol: '₱' },
  { code: 'PKR', symbol: '₨' },
  { code: 'PLN', symbol: 'zł' },
  { code: 'QAR', symbol: 'QR' },
  { code: 'RON', symbol: 'lei' },
  { code: 'RUB', symbol: '₽' },
  { code: 'SAR', symbol: 'SAR' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'THB', symbol: '฿' },
  { code: 'TRY', symbol: '₺' },
  { code: 'TWD', symbol: 'NT$' },
  { code: 'UAH', symbol: '₴' },
  { code: 'USD', symbol: '$' },
  { code: 'VND', symbol: '₫' },
  { code: 'XAF', symbol: 'FCFA' },
  { code: 'XOF', symbol: 'CFA' },
  { code: 'ZAR', symbol: 'R' },
];

function formatRewardOffered(amount: string, currencyCode: string) {
  const trimmedAmount = amount.trim();
  if (!trimmedAmount) return '';

  const selectedCurrency =
    CURRENCY_OPTIONS.find((option) => option.code === currencyCode)
    ?? CURRENCY_OPTIONS.find((option) => option.code === DEFAULT_REWARD_CURRENCY)
    ?? CURRENCY_OPTIONS[0];

  return selectedCurrency.symbol === selectedCurrency.code
    ? `${selectedCurrency.code} ${trimmedAmount}`
    : `${selectedCurrency.symbol}${trimmedAmount} (${selectedCurrency.code})`;
}

function isUserLostPetOwner(
  pet: ApiLostPet,
  userId?: number,
  normalizedUserEmail?: string
) {
  if (userId && pet.reportedById === userId) return true;

  return Boolean(
    normalizedUserEmail &&
    pet.ownerEmail &&
    pet.ownerEmail.trim().toLowerCase() === normalizedUserEmail
  );
}

function formatFinderDate(value?: string) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString();
}

function buildGoogleMapsUrl(latitude?: number, longitude?: number, query?: string) {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  const normalizedQuery = query?.trim();
  return normalizedQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(normalizedQuery)}`
    : null;
}

function buildGmailComposeUrl(email?: string) {
  const normalizedEmail = email?.trim();
  return normalizedEmail
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(normalizedEmail)}`
    : null;
}

function getGeolocationMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location access was denied. We will save the sighting using the location details you entered instead.';
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your location is currently unavailable. We will use the location details you entered instead.';
  }

  if (error.code === error.TIMEOUT) {
    return 'Location lookup timed out. We will use the location details you entered instead.';
  }

  return 'We could not capture your current location. We will use the location details you entered instead.';
}

async function requestBrowserLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      message: 'Live location is unavailable in this browser. We will use the location details you entered instead.',
      latitude: undefined,
      longitude: undefined,
    };
  }

  return new Promise<{
    message: string;
    latitude?: number;
    longitude?: number;
  }>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          message: 'Current location captured. We will attach it to this sighting report.',
        });
      },
      (error) => {
        resolve({
          message: getGeolocationMessage(error),
          latitude: undefined,
          longitude: undefined,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function Field({
  label, required = false, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function ImageUploader({
  label,
  preview,
  onChange,
  onClear,
}: {
  label: string;
  preview: string | null;
  onChange: (base64: string, file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) onChange(ev.target.result as string, file);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {preview ? (
        <div
          className="group relative w-full h-96 rounded-2xl overflow-hidden border-2 border-primary-200 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-sm font-semibold">
            <Upload className="w-4 h-4" /> Change Photo
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 border-2 border-dashed border-primary-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-primary-400 hover:border-primary-400 hover:bg-primary-50 transition-all"
        >
          <Upload className="w-8 h-8" />
          <span className="text-sm font-medium">Click to upload photo</span>
          <span className="text-xs text-gray-400">PNG, JPG, JFIF, WEBP - max 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/jfif,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

const LOST_PET_IMAGE_CLASS = 'w-full h-80 object-cover';
const LOST_PET_IMAGE_FALLBACK_CLASS = 'w-full h-80 bg-primary-50 flex items-center justify-center';

function LostPetCard({
  pet, onView, onSighting, isOwner,
}: { pet: ApiLostPet; onView: () => void; onSighting: () => void; isOwner?: boolean }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover border border-primary-50">
      <div className="relative cursor-pointer" onClick={onView}>
        {pet.imageUrl
          ? <img src={pet.imageUrl} alt={pet.petName} className={LOST_PET_IMAGE_CLASS} />
          : <div className={LOST_PET_IMAGE_FALLBACK_CLASS}>
              <Camera className="w-10 h-10 text-primary-200" />
            </div>
        }
        <span className={`absolute top-3 left-3 shadow text-xs font-bold px-2.5 py-1 rounded-full ${pet.status === 'Found' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
          {pet.status}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-gray-800">{pet.petName}</h3>
        <p className="text-xs text-gray-400 mb-1">{pet.breed} - {pet.type}</p>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{pet.lastSeenLocation}</span>
        </div>
        {pet.rewardOffered && (
          <div className="bg-primary-50 rounded-xl px-3 py-2 mb-3 text-center">
            <p className="text-xs text-primary-500 font-semibold">REWARD OFFERED</p>
            <p className="text-primary-700 font-bold">{formatPhpRewardValue(pet.rewardOffered)}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onView} className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" /> View
          </button>
          {pet.status === 'Missing' && !isOwner && (
            <button onClick={onSighting} className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Sighting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LostPetDetail({
  pet, sightings, onBack, onSighting, onMarkFound, canMarkFound, isOwner, isMarkingFound, actionError, backLabel,
}: {
  pet: ApiLostPet;
  sightings: ApiSighting[];
  onBack: () => void;
  onSighting: () => void;
  onMarkFound: () => void;
  canMarkFound: boolean;
  isOwner: boolean;
  isMarkingFound: boolean;
  actionError: string | null;
  backLabel: string;
}) {
  const latestSighting = [...sightings].sort((a, b) => {
    const dateDiff = new Date(b.dateSeen).getTime() - new Date(a.dateSeen).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  })[0] ?? null;

  const displayLocation = latestSighting?.address || latestSighting?.locationSeen || pet.lastSeenLocation;
  const mapUrl = buildGoogleMapsUrl(
    latestSighting?.latitude,
    latestSighting?.longitude,
    displayLocation
  );
  const displayDate = latestSighting?.dateSeen || pet.lastSeenDate;
  const hasPinnedCoordinates =
    typeof latestSighting?.latitude === 'number' &&
    typeof latestSighting?.longitude === 'number';
  const reporterEmail = pet.ownerEmail?.trim();
  const reporterPhone = pet.ownerPhone?.trim();
  const gmailComposeUrl = buildGmailComposeUrl(reporterEmail);
  const shouldShowReporterContact = !isOwner && Boolean(reporterEmail || reporterPhone);

  const [showFoundConfirm, setShowFoundConfirm] = useState(false);

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm mb-5 hover:text-primary-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-primary-50">
        <div className="px-6 pt-6">
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl">
            {pet.imageUrl
              ? <img src={pet.imageUrl} alt={pet.petName} className={LOST_PET_IMAGE_CLASS} />
              : <div className={LOST_PET_IMAGE_FALLBACK_CLASS}>
                  <Camera className="w-14 h-14 text-primary-200" />
                </div>
            }
            <span className={`absolute top-4 right-4 shadow text-xs font-bold px-2.5 py-1 rounded-full ${pet.status === 'Found' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {pet.status}
            </span>
          </div>
        </div>
        {pet.rewardOffered && (
          <div className="bg-primary-600 text-white text-center py-3">
            <p className="text-xs font-semibold opacity-80">REWARD OFFERED</p>
            <p className="font-display font-bold text-2xl">{formatPhpRewardValue(pet.rewardOffered)}</p>
          </div>
        )}
        <div className="p-6 space-y-6">
          {actionError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <div>
            <h2 className="font-display font-bold text-xl text-gray-900 mb-2">Missing Pet Details</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{pet.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={mapUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="bg-primary-50 rounded-2xl p-4 flex items-start gap-3 transition-all hover:bg-primary-100 hover:shadow-sm"
            >
              <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Last Seen</p>
                <p className="text-sm font-semibold text-gray-800 break-words">{displayLocation}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
                  {hasPinnedCoordinates ? 'Open pinned map location' : 'Open in Google Maps'}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </a>
            <div className="bg-primary-50 rounded-2xl p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Date Seen</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatFinderDate(displayDate)}
                </p>
              </div>
            </div>
          </div>

          {pet.distinctiveFeatures && (
            <div>
              <h3 className="font-bold text-gray-800 mb-2">Distinctive Features</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{pet.distinctiveFeatures}</p>
            </div>
          )}

          <div className="bg-primary-50 rounded-2xl p-4">
            <h3 className="font-bold text-gray-800 mb-3">Pet Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ['Pet Name', pet.petName],
                ['Type', pet.type],
                ['Breed', pet.breed],
                ['Gender', pet.gender],
                ['Age', pet.age ?? '-'],
                ['Weight', formatWeightForDisplay(pet.weight)],
                ['Color', pet.colorAppearance],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className={label === 'Color' ? 'col-span-2' : ''}>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                  <p className="text-gray-700 font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {shouldShowReporterContact && (
            <div className="bg-primary-50 rounded-2xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">Reporter Contact</h3>
              <p className="text-sm font-semibold text-gray-800">{pet.ownerName || 'Reporter'}</p>
              <div className="mt-3 space-y-3">
                {reporterEmail && gmailComposeUrl && (
                  <a
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-primary-100"
                  >
                    <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
                      <p className="break-all font-medium text-primary-700">{reporterEmail}</p>
                    </div>
                  </a>
                )}
                {reporterPhone && (
                  <div className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-gray-700">
                    <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phone Number</p>
                      <p className="font-medium text-gray-800">{reporterPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {pet.status === 'Missing' && (canMarkFound || !canMarkFound) && (
            <div className={`grid gap-3 ${canMarkFound ? '' : 'sm:grid-cols-1'}`}>
              {!canMarkFound && (
                <button onClick={onSighting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Report Sighting
                </button>
              )}

              {canMarkFound && (
                <button
                  type="button"
                  onClick={() => setShowFoundConfirm(true)}
                  disabled={isMarkingFound}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isMarkingFound ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Found
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showFoundConfirm && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Mark as Found?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will mark <strong>{pet.petName}</strong> as found and close the report.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowFoundConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                disabled={isMarkingFound}
                onClick={() => { setShowFoundConfirm(false); onMarkFound(); }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {isMarkingFound ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}

function ReportMissingForm({
  onBack,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  onBack: () => void;
  onSubmit: (data: MissingPetPayload & { imageFile?: File | null }) => Promise<void> | void;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    petName: '', type: MISSING_PET_TYPES[0], breed: '', gender: 'Male',
    age: AGE_OPTIONS[0], weight: '', colorAppearance: '',
    description: '', distinctiveFeatures: '',
    lastSeenLocation: '', lastSeenDate: '',
    rewardAmount: '',
    ownerName: user?.fullName || '',
    ownerEmail: user?.email || '',
    ownerPhone: user?.phone || '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      ownerName: current.ownerName || user?.fullName || '',
      ownerEmail: user?.email || current.ownerEmail,
      ownerPhone: current.ownerPhone || user?.phone || '',
    }));
  }, [user]);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({
        ...f,
        [k]: ADDRESS_MISSING_FIELDS.has(k)
          ? sanitizePetAddressInput(e.target.value)
          : SANITIZED_MISSING_FIELDS.has(k)
            ? sanitizePetTextInput(
                e.target.value,
                MULTILINE_MISSING_FIELDS.has(k),
                COMMA_MISSING_FIELDS.has(k)
              )
            : e.target.value,
      }));

  const setWeight = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({
      ...current,
      weight: getWeightInputValue(e.target.value),
    }));

  const setRewardAmount = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({
      ...current,
      rewardAmount: sanitizePhpAmountInput(e.target.value),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { rewardAmount, ...payload } = form;

    await onSubmit({
      ...payload,
      rewardOffered: formatPhpAmount(rewardAmount),
      imageFile,
    });
  };

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm mb-5 hover:text-primary-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-primary-50">
        <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Report Missing Pet</h2>
        <p className="text-gray-400 text-sm mb-6">Fill in the details to help the community find your pet.</p>

        {submitError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 flex-shrink-0" /> {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2">Pet Photo</p>
            <ImageUploader
              label="Upload a photo of your pet"
              preview={imagePreview}
              onChange={(base64, file) => { setImageFile(file); setImagePreview(base64); }}
              onClear={() => { setImageFile(null); setImagePreview(null); }}
            />
          </div>

          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2">Pet's Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Pet's Name" required>
                  <input className="input-field" placeholder="e.g. Buddy" value={form.petName} onChange={set('petName')} required maxLength={100} />
                </Field>
              </div>
              <Field label="Pet Type" required>
                <select className="input-field" value={form.type} onChange={set('type')} required>
                  {MISSING_PET_TYPES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Breed" required>
                <input className="input-field" placeholder="e.g. Labrador" value={form.breed} onChange={set('breed')} required maxLength={150} />
              </Field>
              <Field label="Gender" required>
                <select className="input-field" value={form.gender} onChange={set('gender')} required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </Field>
              <Field label="Age Range" required>
                <select className="input-field" value={form.age} onChange={set('age')} required>
                  {AGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Weight">
                <div className="relative">
                  <input
                    className="input-field pr-12"
                    inputMode="decimal"
                    placeholder="e.g. 4.5"
                    value={form.weight}
                    onChange={setWeight}
                    maxLength={8}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    kg
                  </span>
                </div>
              </Field>
              <div className="col-span-2">
                <Field label="Color / Appearance" required>
                  <input className="input-field" placeholder="e.g. Brown with white spots" value={form.colorAppearance} onChange={set('colorAppearance')} required maxLength={1000} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Description" required>
                  <textarea className="input-field resize-none" rows={3} placeholder="Describe your pet, including personality and appearance." value={form.description} onChange={set('description')} required maxLength={1000} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Distinctive Features">
                  <textarea className="input-field resize-none" rows={2} placeholder="Collar color, scars, markings, microchip." value={form.distinctiveFeatures} onChange={set('distinctiveFeatures')} maxLength={1000} />
                </Field>
              </div>
            </div>
          </div>

          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2">Last Seen</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Location" required>
                  <input className="input-field" placeholder="Street, landmark, city" value={form.lastSeenLocation} onChange={set('lastSeenLocation')} required maxLength={300} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Date" required>
                  <input type="date" className="input-field" value={form.lastSeenDate} onChange={set('lastSeenDate')} required />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Reward Offered (optional)">
                  <div className="flex items-center overflow-hidden rounded-xl border border-primary-200 bg-white transition-all focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200">
                    <span className="flex h-full items-center border-r border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-gray-500">
                      ₱
                    </span>
                    <input
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm font-sans text-gray-800 outline-none placeholder:text-primary-300"
                      inputMode="numeric"
                      placeholder="e.g. 5000"
                      value={form.rewardAmount}
                      onChange={setRewardAmount}
                      maxLength={12}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Rewards are listed in Philippine Peso only.</p>
                </Field>
              </div>
            </div>
          </div>

          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2">Your Contact Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Your Name" required>
                  <input className="input-field" placeholder="Full name" value={form.ownerName} onChange={set('ownerName')} readOnly />
                </Field>
              </div>
              <Field label="Email" required>
                <input
                  type="email"
                  className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={form.ownerEmail}
                  readOnly
                />
              </Field>
              <Field label="Phone Number" required>
                <input className="input-field" placeholder="+63 9..." value={form.ownerPhone} onChange={set('ownerPhone')} readOnly />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onBack} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportSightingForm({
  lostPets,
  pet,
  onBack,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  lostPets: ApiLostPet[];
  pet: ApiLostPet | null;
  onBack: () => void;
  onSubmit: (data: SightingPayload, lostPetId: number) => Promise<void> | void;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const [selectedId, setSelectedId] = useState<number | ''>(pet?.id ?? '');
  const { user } = useAuth();
  const [form, setForm] = useState({
    reporterName: user?.fullName || '', reporterEmail: user?.email ||  '', 
    reporterPhone: user?.phone || '', locationSeen: '', dateSeen: '', description: '',
  });
  const [locationNotice, setLocationNotice] = useState<{
    tone: 'info' | 'warning';
    message: string;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    setIsLocating(true);
    const locationResult = await requestBrowserLocation();
    setIsLocating(false);
    setLocationNotice({
      tone: locationResult.latitude != null && locationResult.longitude != null ? 'info' : 'warning',
      message: locationResult.message,
    });

    await onSubmit(
      {
        ...form,
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
      },
      selectedId as number
    );
  };

  const missingPets = lostPets.filter(p => p.status === 'Missing');

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm mb-5 hover:text-primary-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-primary-50">
        <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Report Sighting</h2>
        <p className="text-gray-400 text-sm mb-6">
          {pet ? <>Reporting sighting for <strong>{pet.petName}</strong></> : 'Tell us which pet you spotted and where.'}
        </p>

        {submitError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 flex-shrink-0" /> {submitError}
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          We will ask for your current location when you submit so the sighting can be pinned on the map when available.
        </div>

        {locationNotice && (
          <div className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
            locationNotice.tone === 'info'
              ? 'border border-primary-100 bg-primary-50 text-primary-700'
              : 'border border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {locationNotice.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Pet Details
            </p>

            {!pet && (
              <Field label="Which pet did you spot?" required>
                <select
                  className="input-field"
                  value={selectedId}
                  onChange={e => setSelectedId(Number(e.target.value) || '')}
                  required
                >
                  <option value="">Select a missing pet</option>
                  {missingPets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.petName} ({p.breed} - {p.type})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {pet && (
              <div className="flex items-center gap-3 bg-primary-50 rounded-2xl p-4">
                {pet.imageUrl ? (
                  <img src={pet.imageUrl} alt={pet.petName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0">PET</div>
                )}
                <div>
                  <p className="font-bold text-gray-800 text-sm">{pet.petName}</p>
                  <p className="text-xs text-gray-400">{pet.breed} - {pet.type}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{pet.lastSeenLocation}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2 flex items-center gap-2">
              <UserCircle2 className="w-4 h-4" /> Reporter Details
            </p>
            <Field label="Your Name" required>
              <input className="input-field" placeholder="Your full name" value={form.reporterName} onChange={set('reporterName')} readOnly />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" required>
                <input type="email" className="input-field" placeholder="your@email.com" value={form.reporterEmail} onChange={set('reporterEmail')} readOnly />
              </Field>
              <Field label="Phone" required>
                <input className="input-field" placeholder="+63 9..." value={form.reporterPhone} onChange={set('reporterPhone')} readOnly />
              </Field>
            </div>
          </div>

          <div>
            <p className="font-bold text-primary-600 text-sm mb-3 border-b border-primary-100 pb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Sighting Details
            </p>
            <Field label="Where did you see it?" required>
              <input className="input-field" placeholder="Street, landmark, city..." value={form.locationSeen} onChange={set('locationSeen')} required maxLength={300} />
            </Field>
            <Field label="Date Seen" required>
              <input type="date" className="input-field" value={form.dateSeen} onChange={set('dateSeen')} required />
            </Field>
            <Field label="Description" required>
              <textarea className="input-field resize-none" rows={4} placeholder="Describe what you saw, the pet's condition, behavior..." value={form.description} onChange={set('description')} required maxLength={1000}/>
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onBack} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLocating || isSubmitting || (!pet && !selectedId)} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {isLocating ? <><Loader2 className="w-4 h-4 animate-spin" /> Capturing Location...</> : isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Sighting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmReport({
  reportType,
  onConfirm,
  successNotice,
}: {
  reportType: string;
  onConfirm: () => void;
  successNotice?: string | null;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-bounce-in">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-primary-50 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>
        <h2 className="font-display font-bold text-xl text-gray-900 mb-2">
          {reportType === 'missing' ? 'Report Submitted!' : successNotice || 'Sighting Reported Successfully'}
        </h2>
        <p className="text-gray-500 text-sm mb-7">
          {reportType === 'missing'
            ? 'Your missing pet report has been posted. The community will help search!'
            : 'Your sighting has been submitted and the owner will be notified.'}
        </p>
        <button onClick={onConfirm} className="btn-primary w-full py-3">
          {reportType === 'missing' ? 'View Details' : 'Done'}
        </button>
      </div>
    </div>
  );
}

export default function PetFinderPage() {
  const {
    lostPets, sightings, activeView, selectedLostPet,
    searchQuery, setSearchQuery, isLoading, isSubmitting, isUpdatingPetStatus, submitError, reportType, successNotice,
    viewDetail, openReportMissing, openReportSighting,
    submitMissingReport, submitSightingReport, markLostPetAsFound, confirmReport, goBack, clearSuccessNotice,
  } = usePetFinderViewModel();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listMode, setListMode] = useState<'recent' | 'your-reports'>('recent');
  const handledNavigationAction = useRef<string | null>(null);

  const normalizedUserEmail = user?.email?.trim().toLowerCase() || '';
  const recentReports = lostPets.filter((pet) => pet.status === 'Missing');
  const yourReports = lostPets.filter((pet) => (
    pet.status === 'Missing' &&
    isUserLostPetOwner(pet, user?.id, normalizedUserEmail)
  ));

  const sourcePets = listMode === 'your-reports' ? yourReports : recentReports;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const displayPets = sourcePets.filter((pet) => (
    !normalizedSearch
      || pet.petName.toLowerCase().includes(normalizedSearch)
      || pet.breed.toLowerCase().includes(normalizedSearch)
      || pet.type.toLowerCase().includes(normalizedSearch)
  ));
  const isShowingYourReports = listMode === 'your-reports';
  const navigationAction = (location.state as {
    petFinderAction?: { petId: number; type: 'view' | 'sighting' };
  } | null)?.petFinderAction;

  useEffect(() => {
    if (!navigationAction) {
      handledNavigationAction.current = null;
      return;
    }

    if (isLoading || lostPets.length === 0) return;

    const actionKey = `${location.key}:${navigationAction.type}:${navigationAction.petId}`;
    if (handledNavigationAction.current === actionKey) return;

    handledNavigationAction.current = actionKey;

    const targetPet = lostPets.find((pet) => pet.id === navigationAction.petId);
    setListMode('recent');

    if (targetPet) {
      if (navigationAction.type === 'sighting') {
        openReportSighting(targetPet);
      } else {
        void viewDetail(targetPet);
      }
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [
    isLoading,
    location.key,
    location.pathname,
    lostPets,
    navigate,
    navigationAction,
    openReportSighting,
    viewDetail,
  ]);

  if (activeView === 'detail' && selectedLostPet) {
    const isOwner = isUserLostPetOwner(selectedLostPet, user?.id, normalizedUserEmail);
    const canMarkFound = selectedLostPet.status === 'Missing' && isOwner;

    return (
      <div className="p-4 lg:p-8">
        <LostPetDetail
          pet={selectedLostPet}
          sightings={sightings}
          onBack={goBack}
          onSighting={() => openReportSighting(selectedLostPet)}
          onMarkFound={() => markLostPetAsFound(selectedLostPet.id)}
          canMarkFound={canMarkFound}
          isOwner={isOwner}
          isMarkingFound={isUpdatingPetStatus}
          actionError={submitError}
          backLabel={isShowingYourReports ? 'Your Reports' : 'All Reported pets'}
        />
      </div>
    );
  }

  if (activeView === 'report-missing') {
    return (
      <div className="p-4 lg:p-8">
        <ReportMissingForm
          onBack={goBack}
          onSubmit={submitMissingReport}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      </div>
    );
  }

  if (activeView === 'report-sighting') {
    return (
      <div className="p-4 lg:p-8">
        <ReportSightingForm
          lostPets={lostPets}
          pet={selectedLostPet}
          onBack={goBack}
          onSubmit={submitSightingReport}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      </div>
    );
  }

  if (activeView === 'confirm-report') {
    return (
      <div className="p-4 lg:p-8">
        <ConfirmReport reportType={reportType} onConfirm={confirmReport} successNotice={successNotice} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-gray-800 text-xl">
            {isShowingYourReports ? 'Your Reports' : 'Find Lost Pets'}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {isShowingYourReports
              ? 'Review the missing pet reports you have submitted.'
              : 'Help reunite missing pets with their families'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setListMode('recent')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              !isShowingYourReports
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white text-gray-500 border border-primary-100 hover:bg-primary-50'
            }`}
          >
            All Reported pets
          </button>
          <button
            onClick={() => setListMode('your-reports')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              isShowingYourReports
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-500 border border-primary-100 hover:bg-primary-50'
            }`}
          >
            Your Reports{yourReports.length > 0 ? ` (${yourReports.length})` : ''}
          </button>
          <button onClick={() => openReportSighting()} className="btn-secondary flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4" /> Report Sighting
          </button>
          <button onClick={openReportMissing} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Report Missing Pet
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearSuccessNotice}
            className="rounded-full p-1 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
            aria-label="Dismiss success notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ClearableSearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={isShowingYourReports ? 'Search your reports by name, breed, type...' : 'Search by name, breed, type...'}
        containerClassName="mb-6"
        clearLabel="Clear pet finder search"
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : displayPets.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList className="w-10 h-10 text-primary-300 mx-auto mb-3" />
          <p className="font-bold text-gray-600 mb-1">
            {isShowingYourReports ? 'No missing pet reports yet' : 'No missing pets found'}
          </p>
          <p className="text-gray-400 text-sm">
            {isShowingYourReports
              ? 'Missing pet reports you submit will appear here. Sighting reports are not included in this section.'
              : 'Try adjusting your search or be the first to report one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayPets.map(pet => (
            <LostPetCard
              key={pet.id}
              pet={pet}
              onView={() => viewDetail(pet)}
              onSighting={() => openReportSighting(pet)}
              isOwner={isUserLostPetOwner(pet, user?.id, normalizedUserEmail)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
