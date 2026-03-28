import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Heart, X, ChevronRight, MapPin, Info, Phone, Mail, CheckCircle2, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ModalPortal from '../../components/ModalPortal';
import ImageLightbox from '../../components/ImageLightbox';
import ClearableSearchField from '../../components/ClearableSearchField';
import { PetType } from '../../models';
import { useAuth, usePets } from '../../context/AppContext';
import type { ApiPet } from '../../services/api';
import { sanitizePetAddressInput } from '../../utils/petTextSanitizers';
import { formatWeightForDisplay } from '../../utils/petWeight';

const PET_TYPES: PetType[] = ['All', 'Dogs', 'Cats', 'Birds', 'Small Animals', 'Reptiles', 'Others'];
const FALLBACK_PET_IMAGE = 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&q=80';

export type AdoptionFormData = {
  fullName: string;
  email: string;
  phone: string;
  homeAddress: string;
  previousPetExperience: string;
  whyAdopt: string;
  whyChooseYou: string;
};

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

// Pet Detail Modal
export function PetDetailModal({
  pet,
  error,
  onClose,
  onAdopt,
}: {
  pet: ApiPet;
  error: string | null;
  onClose: () => void;
  onAdopt: () => void;
}) {
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const detailImageUrl = pet.imageUrl || FALLBACK_PET_IMAGE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-bounce-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-primary-50">
          <button
            type="button"
            onClick={() => setIsImageLightboxOpen(true)}
            className="block w-full cursor-zoom-in rounded-t-3xl bg-primary-50 text-left"
            aria-label={`View full photo of ${pet.name}`}
          >
            <img
              src={detailImageUrl}
              alt={pet.name}
              className="block w-full h-auto rounded-t-3xl object-contain"
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <span className="badge-available absolute bottom-4 right-4 shadow">{pet.status}</span>
        </div>
        <div className="p-6">
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-1">About {pet.name}</h2>
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">{pet.description}</p>

          <div className="bg-primary-50 rounded-2xl p-4 mb-5 grid grid-cols-2 gap-3">
            <h3 className="font-display font-bold text-base text-gray-800 col-span-2 mb-1">Pet Information</h3>
            {[
              ['Pet Name', pet.name], ['Pet Type', pet.type], ['Breed', pet.breed],
              ['Gender', pet.gender], ['Age', pet.age], ['Weight', formatWeightForDisplay(pet.weight)],
              ['Colour', pet.colorAppearance],
            ].map(([label, value]) => (
              <div key={label} className={label === 'Colour' ? 'col-span-2' : ''}>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <h3 className="font-display font-bold text-base text-gray-800 mb-3">About the Shelter</h3>
            <p className="text-sm font-semibold text-gray-700 mb-2">{pet.shelterName}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-primary-400" /> {pet.location || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="w-3.5 h-3.5 text-primary-400" /> {pet.shelterEmail || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="w-3.5 h-3.5 text-primary-400" /> {pet.shelterPhone || 'N/A'}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button onClick={onAdopt} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2">
            <Heart className="w-4 h-4" /> Adopt {pet.name}
          </button>
        </div>
        <ImageLightbox
          imageUrl={detailImageUrl}
          alt={pet.name}
          isOpen={isImageLightboxOpen}
          onClose={() => setIsImageLightboxOpen(false)}
        />
      </div>
    </div>
  );
}

// Application Form Modal
export function ApplicationModal({ pet, onClose, onSubmit }: {
  pet: ApiPet; onClose: () => void;
  onSubmit: (data: AdoptionFormData) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<AdoptionFormData>({
    fullName: user?.fullName || '', email: user?.email || '',
    phone: user?.phone || '', homeAddress: sanitizePetAddressInput(user?.address || ''),
    previousPetExperience: '', whyAdopt: '', whyChooseYou: '',
  });

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({
      ...f,
      [k]: k === 'homeAddress' ? sanitizePetAddressInput(e.target.value) : e.target.value,
    }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-bounce-in">
        <div className="sticky top-0 bg-white border-b border-primary-100 px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-900">Adoption Application</h2>
            <p className="text-xs text-gray-400">Applying for {pet.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Your Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Full Name" required>
                  <input className="input-field" placeholder="Your full name" value={form.fullName} onChange={set('fullName')} readOnly />
                </Field>
              </div>
              <Field label="Email" required>
                <input type="email" className="input-field" placeholder="your@email.com" value={form.email} onChange={set('email')} readOnly />
              </Field>
              <Field label="Phone" required>
                <input className="input-field" placeholder="+63 9..." value={form.phone} onChange={set('phone')} readOnly />
              </Field>
              <div className="col-span-2">
                <Field label="Home Address" required>
                  <input className="input-field" placeholder="Street, City, State, Zip Code" value={form.homeAddress} onChange={set('homeAddress')} required maxLength={300} />
                </Field>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              About Your Experience
            </h3>
            <div className="space-y-3">
              <Field label="Previous Pet Experience" required>
                <textarea className="input-field resize-none" rows={3} placeholder="Describe your experience with pets, if any..." value={form.previousPetExperience} onChange={set('previousPetExperience')} required maxLength={1000} />
              </Field>
              <Field label={`Why do you want to adopt ${pet.name}?`} required>
                <textarea className="input-field resize-none" rows={3} placeholder={`Share why ${pet.name} is a good fit for your home...`} value={form.whyAdopt} onChange={set('whyAdopt')} required maxLength={1000} />
              </Field>
              <Field label="Why should you be chosen to adopt?" required>
                <textarea className="input-field resize-none" rows={3} placeholder="Tell us what makes you an ideal adopter..." value={form.whyChooseYou} onChange={set('whyChooseYou')} required maxLength={1000} />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Go Back</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Verification Modal
export function VerificationModal({
  pet,
  error,
  onClose,
  onConfirm,
}: {
  pet: ApiPet;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const commitments = [
    'I commit to providing a loving, safe, and permanent home for this pet.',
    'I will provide consistent training and socialization to help the pet adapt and thrive in my home.',
    'I understand that pets may experience behavioral or health challenges and I am committed to addressing these with patience and professional support.',
    'I will not abandon, sell, or give away the pet without first contacting the adoption agency for guidance.',
    'I am prepared for the long-term commitment required, understanding that pet ownership can span many years.',
    'I understand the financial responsibilities involved in pet ownership, including food, veterinary care, and other necessities.',
  ];
  const [checked, setChecked] = useState<boolean[]>(new Array(commitments.length).fill(false));
  const allChecked = checked.every(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-bounce-in">
        <div className="sticky top-0 bg-white border-b border-primary-100 px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-900">Adoption Verification</h2>
            <p className="text-xs text-gray-400">Before adopting {pet.name}, please confirm:</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {commitments.map((text, i) => (
            <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked[i] ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
              <div
                onClick={() => setChecked(c => c.map((v, idx) => idx === i ? !v : v))}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked[i] ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}
              >
                {checked[i] && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
            </label>
          ))}
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1">Go Back</button>
            <button onClick={onConfirm} disabled={!allChecked} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              I Understand, Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Success Modal
export function SuccessModal({ pet, onViewApplications }: { pet: ApiPet; onViewApplications: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-bounce-in text-center p-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>
        <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 text-sm mb-2">Your application for <strong>{pet.name}</strong> has been received.</p>
        <p className="text-gray-400 text-xs mb-7">We&apos;ll review it and get back to you within 3-5 business days. Thank you for making a difference!</p>
        <img src={pet.imageUrl || FALLBACK_PET_IMAGE} alt={pet.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-primary-100" />
        <button onClick={onViewApplications} className="btn-primary w-full py-3">View Applications</button>
      </div>
    </div>
  );
}

// Pet Card
function PetCard({ pet, onView }: { pet: ApiPet; onView: () => void }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover border border-primary-50 cursor-pointer" onClick={onView}>
      <div className="relative">
        <img src={pet.imageUrl || FALLBACK_PET_IMAGE} alt={pet.name} className="w-full h-64 object-cover" />
        <span className="badge-available absolute top-3 right-3 shadow">{pet.status}</span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-gray-800 text-base mb-0.5">{pet.name}</h3>
        <p className="text-xs text-gray-400 mb-3">{pet.breed} · {pet.age}</p>
        <button className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5" onClick={e => { e.stopPropagation(); onView(); }}>
          <Heart className="w-3.5 h-3.5" /> Adopt me
        </button>
      </div>
    </div>
  );
}

// Home Page
export default function PetAdoptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    pets, filteredPets, isLoading, searchQuery, setSearchQuery, selectedType, setSelectedType,
    selectedPet, adoptionStep, openPetDetail, startAdoption, submitApplication,
    confirmAdoption, closeModal, applications, error, fetchPets,
  } = usePets();
  const handledNotificationPetRef = useRef<string | null>(null);

  const pendingCount = applications.filter(a => a.status === 'Pending').length;
  const hasActivePetSearchOrFilter = searchQuery.trim().length > 0 || selectedType !== 'All';
  const notificationPetId = (() => {
    const petIdParam = new URLSearchParams(location.search).get('petId');
    const petId = Number(petIdParam);
    return Number.isInteger(petId) && petId > 0 ? petId : null;
  })();

  useEffect(() => {
    void fetchPets();
  }, [fetchPets]);

  useEffect(() => {
    if (notificationPetId == null) {
      handledNotificationPetRef.current = null;
      return;
    }

    if (isLoading) return;

    const actionKey = `${location.key}:${notificationPetId}`;
    if (handledNotificationPetRef.current === actionKey) return;

    handledNotificationPetRef.current = actionKey;

    const targetPet = pets.find((pet) => pet.id === notificationPetId);
    if (targetPet) {
      openPetDetail(targetPet);
    }

    navigate(location.pathname, { replace: true });
  }, [
    isLoading,
    location.key,
    location.pathname,
    navigate,
    notificationPetId,
    openPetDetail,
    pets,
  ]);

  const handleViewApplications = () => {
    closeModal();
    navigate('/dashboard/applications');
  };

  const scrollToCatalog = () => {
    document.getElementById('pet-adoption-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      <div className="relative bg-gradient-to-r from-primary-700 to-primary-500 rounded-3xl p-6 lg:p-8 mb-8 overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
          <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80" alt="dog" className="h-full w-full object-cover object-left" />
        </div>
        <div className="relative z-10 max-w-lg">
          <p className="text-primary-200 text-sm font-semibold mb-2">Welcome back, {user?.fullName?.split(' ')[0] ?? 'Friend'} </p>
          <h2 className="font-display font-bold text-2xl lg:text-3xl text-white mb-3 leading-tight">
            Pet adoption starts<br />with the right match
          </h2>
          <p className="text-primary-200 text-sm mb-5">Browse recently added pets that are ready for adoption, explore by type, and start your application when you find the right companion.</p>
          <button
            type="button"
            onClick={scrollToCatalog}
            className="bg-white text-primary-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary-50 transition-all active:scale-95"
          >
            Browse Pets
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Info className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-sm text-amber-800">
            You have <strong>{pendingCount}</strong> pending adoption application{pendingCount > 1 ? 's' : ''}. Check the Applications tab for updates.
          </p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <ClearableSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, breed, type..."
          clearLabel="Clear pet adoption search"
        />
        <div className="flex gap-2 flex-wrap">
          {PET_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedType === type
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                  : 'bg-white text-gray-500 border border-primary-100 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div id="pet-adoption-catalog">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-gray-800 text-lg">
            Pets for Adoption <span className="text-primary-400 font-normal text-base">({filteredPets.length})</span>
          </h2>
        </div>
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">Loading featured pets...</p>
          </div>
        ) : filteredPets.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-500">
              <Heart className="h-7 w-7 fill-current" />
            </div>
            {pets.length === 0 ? (
              <>
                <p className="font-bold text-gray-600 mb-1">All the animals have been loved and adopted.</p>
                <p className="text-gray-400 text-sm">Please come back for more updates!</p>
              </>
            ) : hasActivePetSearchOrFilter ? (
              <>
                <p className="font-bold text-gray-600 mb-1">No pets found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filter.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-gray-600 mb-1">All the animals have been loved and adopted.</p>
                <p className="text-gray-400 text-sm">Please come back for more updates!</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPets.map(pet => (
              <PetCard key={pet.id} pet={pet} onView={() => openPetDetail(pet)} />
            ))}
          </div>
        )}
      </div>

      {selectedPet && adoptionStep === 'detail' && (
        <ModalPortal>
          <PetDetailModal pet={selectedPet} error={error} onClose={closeModal} onAdopt={startAdoption} />
        </ModalPortal>
      )}
      {selectedPet && adoptionStep === 'application' && (
        <ModalPortal>
          <ApplicationModal
            pet={selectedPet}
            onClose={closeModal}
            onSubmit={submitApplication}
          />
        </ModalPortal>
      )}
      {selectedPet && adoptionStep === 'verification' && (
        <ModalPortal>
          <VerificationModal pet={selectedPet} error={error} onClose={closeModal} onConfirm={confirmAdoption} />
        </ModalPortal>
      )}
      {selectedPet && adoptionStep === 'success' && (
        <ModalPortal>
          <SuccessModal pet={selectedPet} onViewApplications={handleViewApplications} />
        </ModalPortal>          
      )}
    </div>
  );
}
