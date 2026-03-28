import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Plus, Edit3, Trash2, X, Loader2, Upload, ImageIcon } from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import ClearableSearchField from '../../components/ClearableSearchField';
import PangasinanLocationInput from '../../components/PangasinanLocationInput';
import { adminApi, ApiPet } from '../../services/api';
import { sanitizePetAddressInput, sanitizePetTextInput } from '../../utils/petTextSanitizers';
import { formatWeightForStorage, getWeightInputValue } from '../../utils/petWeight';
import {
  getPangasinanLocationValidationMessage,
  isPangasinanLocationValue,
} from '../../utils/pangasinanLocation';
import {
  formatPhilippinePhoneNumber,
  getPhilippinePhoneValidationMessage,
  isValidPhilippinePhoneNumber,
  PHILIPPINES_DIAL_CODE,
  PHILIPPINES_LOCAL_PHONE_LENGTH,
  PHILIPPINES_PHONE_PLACEHOLDER,
  sanitizePhilippinePhoneNumber,
} from '../../utils/philippinePhone';

type SelectOption = string | { value: string; label: string };

const PET_TYPES = [
  { value: 'Dogs', label: 'Dog' },
  { value: 'Cats', label: 'Cat' },
  { value: 'Birds', label: 'Bird' },
  { value: 'Small Animals', label: 'Small Animal' },
  { value: 'Reptiles', label: 'Reptile' },
  { value: 'Other', label: 'Other' },
] as const;
const PET_STATUSES = ['Available','Pending','Adopted'];
const EDITABLE_PET_STATUSES = PET_STATUSES.filter((status) => status !== 'Adopted');
const GENDERS = ['Male','Female'];
const AGE_RANGES = ['Under 1 year', '1-2 years', '3-5 years', '6-10 years', '10+ years', 'Unknown'];
const SANITIZED_ADMIN_FIELDS = new Set<keyof ApiPet>([
  'name',
  'breed',
  'colorAppearance',
  'description',
  'distinctiveFeatures',
  'shelterName',
]);
const MULTILINE_ADMIN_FIELDS = new Set<keyof ApiPet>(['description', 'distinctiveFeatures']);
const COMMA_ADMIN_FIELDS = new Set<keyof ApiPet>(['colorAppearance', 'description', 'distinctiveFeatures']);
const ADDRESS_ADMIN_FIELDS = new Set<keyof ApiPet>(['location']);
const ADOPTED_PET_LOCK_MESSAGE = 'This pet has already been adopted by its new owners.';

const EMPTY: Partial<ApiPet> = {
  name:'', type:PET_TYPES[0].value, breed:'', gender:'Male', age:AGE_RANGES[0], weight:'',
  colorAppearance:'', description:'', distinctiveFeatures:'', imageUrl:'',
  status:'Available', shelterName:'', shelterEmail:'', shelterPhone:'', location:'',
};

// ── Field helpers defined OUTSIDE the component to prevent remount on every render ──

interface FieldProps {
  label: string;
  k: keyof ApiPet;
  required?: boolean;
  type?: string;
  as?: 'input' | 'textarea';
  placeholder?: string;
  form: Partial<ApiPet>;
  onChange: (k: keyof ApiPet) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const Field = ({ label, k, required = false, type = 'text', as = 'input', placeholder, form, onChange }: FieldProps) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {as === 'textarea'
      ? <textarea className="input-field resize-none" rows={3} placeholder={placeholder} value={(form as Record<string, string>)[k] || ''} onChange={onChange(k)} />
      : <input type={type} className="input-field" placeholder={placeholder} value={(form as Record<string, string>)[k] || ''} onChange={onChange(k)} />
    }
  </div>
);

interface SelectFieldProps {
  label: string;
  k: keyof ApiPet;
  required?: boolean;
  options: readonly SelectOption[];
  form: Partial<ApiPet>;
  onChange: (k: keyof ApiPet) => (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectField = ({ label, k, required = false, options, form, onChange }: SelectFieldProps) => {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        className="input-field"
        value={(form as Record<string, string>)[k] || normalizedOptions[0]?.value}
        onChange={onChange(k)}
      >
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

function sanitizeAdminValue(key: keyof ApiPet, value: string) {
  if (ADDRESS_ADMIN_FIELDS.has(key)) {
    return sanitizePetAddressInput(value);
  }

  if (SANITIZED_ADMIN_FIELDS.has(key)) {
    return sanitizePetTextInput(
      value,
      MULTILINE_ADMIN_FIELDS.has(key),
      COMMA_ADMIN_FIELDS.has(key)
    );
  }

  return value;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPetsPage() {
  const [pets, setPets]           = useState<ApiPet[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [form, setForm]           = useState<Partial<ApiPet>>(EMPTY);
  const [editId, setEditId]       = useState<number | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [deletePet, setDeletePet] = useState<ApiPet | null>(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [msgType, setMsgType]     = useState<'success' | 'error'>('success');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async (q?: string) => {
    setLoading(true);
    try { setPets(await adminApi.getPets(q ? { search: q } : undefined)); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Generic change handler — stable reference via useCallback not needed here
  // because Field is now outside the component tree
  const set = (k: keyof ApiPet) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: sanitizeAdminValue(k, e.target.value) }));

  const setWeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      weight: getWeightInputValue(e.target.value),
    }));
  };

  const setShelterPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localNumber = sanitizePhilippinePhoneNumber(e.target.value);

    setForm((current) => ({
      ...current,
      shelterPhone: localNumber ? formatPhilippinePhoneNumber(localNumber) : '',
    }));
  };

  const openCreate = () => {
    setForm({ ...EMPTY });
    setEditId(null);
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (p: ApiPet) => {
    if (p.status === 'Adopted') {
      setMsgType('error');
      setMsg(ADOPTED_PET_LOCK_MESSAGE);
      return;
    }

    setForm({
      ...p,
      name: sanitizeAdminValue('name', p.name),
      breed: sanitizeAdminValue('breed', p.breed),
      colorAppearance: sanitizeAdminValue('colorAppearance', p.colorAppearance),
      description: sanitizeAdminValue('description', p.description),
      distinctiveFeatures: sanitizeAdminValue('distinctiveFeatures', p.distinctiveFeatures || ''),
      shelterName: sanitizeAdminValue('shelterName', p.shelterName || ''),
      shelterPhone: sanitizeAdminValue('shelterPhone', p.shelterPhone || ''),
      location: sanitizeAdminValue('location', p.location || ''),
      weight: getWeightInputValue(p.weight),
    });
    setEditId(p.id);
    setImageFile(null);
    setImagePreview(p.imageUrl || '');
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (form.location?.trim() && !isPangasinanLocationValue(form.location)) {
      setMsgType('error');
      setMsg(getPangasinanLocationValidationMessage('Shelter location'));
      return;
    }

    if (form.shelterPhone?.trim() && !isValidPhilippinePhoneNumber(form.shelterPhone)) {
      setMsgType('error');
      setMsg(`Shelter phone: ${getPhilippinePhoneValidationMessage()}`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        imageUrl: form.imageUrl || '',
        weight: formatWeightForStorage(form.weight),
      };
      const formData = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value == null ? '' : String(value));
      });

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editId) {
        const updated = await adminApi.updatePet(editId, formData);
        setPets(p => p.map(x => x.id === updated.id ? updated : x));
        setMsgType('success');
        setMsg('Pet updated successfully.');
      } else {
        const created = await adminApi.createPet(formData);
        setPets(p => [created, ...p]);
        setMsgType('success');
        setMsg('Pet created successfully.');
      }
      setShowForm(false);
    } catch (err: unknown) {
      setMsgType('error');
      setMsg(err instanceof Error ? err.message : 'Error saving pet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePet) return;
    setSaving(true);
    try {
      await adminApi.deletePet(deletePet.id);
      setPets(p => p.filter(x => x.id !== deletePet.id));
      setDeletePet(null);
      setMsgType('success');
      setMsg('Pet deleted.');
    } catch (err: unknown) {
      setMsgType('error');
      setMsg(err instanceof Error ? err.message : 'Error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {msg && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${
            msgType === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg('')} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-gray-800">Pets</h2>
          <p className="text-gray-400 text-sm">{pets.length} pets in database</p>
        </div>
        <div className="flex gap-2">
          <ClearableSearchField
            value={search}
            onChange={setSearch}
            onClear={() => load()}
            onKeyDown={e => e.key === 'Enter' && load(search)}
            placeholder="Search pets..."
            inputClassName="w-48"
            iconClassName="text-gray-400"
            clearLabel="Clear pets search"
          />
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Pet
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map(pet => (
            <div key={pet.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative">
                {pet.imageUrl
                  ? <img src={pet.imageUrl} alt={pet.name} className="w-full h-56 object-cover" />
                  : <div className="w-full h-36 bg-primary-50 flex items-center justify-center text-primary-300 text-4xl">🐾</div>
                }
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                  pet.status === 'Available' ? 'bg-emerald-100 text-emerald-700'
                  : pet.status === 'Adopted'   ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
                }`}>{pet.status}</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-0.5">{pet.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{pet.breed} · {pet.type}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(pet)}
                    className={`flex-1 flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg text-xs transition-colors ${
                      pet.status === 'Adopted'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => setDeletePet(pet)} className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-500 font-semibold py-2 rounded-lg text-xs hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pets.length === 0 && <p className="col-span-full text-center py-20 text-gray-400">No pets found.</p>}
        </div>
      )}

      {/* Pet Form Modal */}
      {showForm && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-bounce-in overflow-x-hidden">
            <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-800">{editId ? 'Edit Pet' : 'Add New Pet'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">

              {/* Image Upload */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pet Photo</label>
                <div
                  className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary-400 transition-colors"
                  style={{ minHeight: '140px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm">Click to upload a photo</span>
                      <span className="text-xs">PNG, JPG, JFIF, WEBP supported</span>
                    </div>
                  )}
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm font-semibold">
                      <Upload className="w-4 h-4" /> Change Photo
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/jfif,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <button
                    className="mt-1.5 text-xs text-red-400 hover:text-red-600"
                    onClick={() => { setImageFile(null); setImagePreview(''); setForm(f => ({ ...f, imageUrl: '' })); }}
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <div className="col-span-2">
                <Field label="Pet Name" k="name" required placeholder="e.g. Buddy" form={form} onChange={set} />
              </div>
              <SelectField label="Type"   k="type"   required options={PET_TYPES}    form={form} onChange={set} />
              <SelectField label="Gender" k="gender" required options={GENDERS}      form={form} onChange={set} />
              <Field label="Breed"        k="breed"  required placeholder="e.g. Labrador" form={form} onChange={set} />
              <SelectField label="Age Range" k="age" required options={AGE_RANGES} form={form} onChange={set} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Weight <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field pr-12"
                    placeholder="e.g. 4.5"
                    value={form.weight || ''}
                    onChange={setWeight}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    kg
                  </span>
                </div>
              </div>
              <SelectField
                label="Status"
                k="status"
                options={editId ? EDITABLE_PET_STATUSES : PET_STATUSES}
                form={form}
                onChange={set}
              />
              <div className="col-span-2">
                <Field label="Color / Appearance" k="colorAppearance" required placeholder="e.g. Brown with white spots" form={form} onChange={set} />
              </div>
              <div className="col-span-2">
                <Field label="Description" k="description" required as="textarea" placeholder="e.g. Friendly and playful, loves people and daily walks." form={form} onChange={set} />
              </div>
              <div className="col-span-2">
                <Field label="Distinctive Features" k="distinctiveFeatures" as="textarea" placeholder="e.g. Blue collar, white patch on chest, responds to whistles." form={form} onChange={set} />
              </div>
              <Field label="Shelter Name"  k="shelterName"  placeholder="e.g. Paws Haven Shelter" form={form} onChange={set} />
              <Field label="Shelter Email" k="shelterEmail" placeholder="e.g. shelter@example.com" form={form} onChange={set} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Shelter Phone</label>
                <div className="flex items-center overflow-hidden rounded-xl border border-primary-200 bg-white transition-all focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200">
                  <span className="flex h-full items-center border-r border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-gray-500">
                    {PHILIPPINES_DIAL_CODE}
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm font-sans text-gray-800 outline-none placeholder:text-primary-300"
                    placeholder={PHILIPPINES_PHONE_PLACEHOLDER}
                    value={sanitizePhilippinePhoneNumber(form.shelterPhone || '')}
                    onChange={setShelterPhone}
                    maxLength={PHILIPPINES_LOCAL_PHONE_LENGTH}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter up to 11 digits for a Philippine mobile number starting with 09.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Location</label>
                <PangasinanLocationInput
                  value={form.location || ''}
                  onChange={(value) => setForm((current) => ({ ...current, location: value }))}
                  placeholder="Search Pangasinan shelter location"
                  maxLength={255}
                  helperText="Shelter location suggestions are limited to Pangasinan, Philippines."
                />
              </div>

              <div className="col-span-2 flex gap-3 mt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editId ? 'Update Pet' : 'Create Pet'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete confirm */}
      {deletePet && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Delete {deletePet.name}?</h3>
            <p className="text-gray-400 text-sm mb-6">This will permanently remove this pet and all related applications.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePet(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
