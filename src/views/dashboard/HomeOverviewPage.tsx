import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Camera, Eye, Heart, Info, MapPin } from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { useAuth, usePets } from '../../context/AppContext';
import { ApiLostPet, ApiPet, lostPetsApi } from '../../services/api';
import { formatPhpRewardValue } from '../../utils/phpCurrency';
import {
  ApplicationModal,
  PetDetailModal,
  SuccessModal,
  VerificationModal,
} from './Homepage';

const FALLBACK_PET_IMAGE = 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&q=80';
const MISSING_PET_IMAGE_CLASS = 'w-full h-80 object-cover';
const MISSING_PET_IMAGE_FALLBACK_CLASS = 'w-full h-80 bg-primary-50 flex items-center justify-center';

function formatDateLabel(value?: string) {
  if (!value) return 'Recently shared';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently shared';

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function FeaturedPetCard({ pet, onOpen }: { pet: ApiPet; onOpen: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm">
      <img src={pet.imageUrl || FALLBACK_PET_IMAGE} alt={pet.name} className="h-56 w-full object-cover" />
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-gray-900">{pet.name}</h3>
            <p className="text-sm text-gray-500">{pet.breed || 'Unknown breed'} - {pet.type}</p>
          </div>
          <span className="badge-available flex-shrink-0">{pet.status}</span>
        </div>
        <div className="mb-4 space-y-2 text-sm text-gray-500">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-400" />
            <span className="truncate">{pet.location || 'Shelter location available on the adoption page'}</span>
          </p>
          <p>Added {formatDateLabel(pet.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5"
        >
          <Heart className="h-3.5 w-3.5" />
          Adopt me
        </button>
      </div>
    </div>
  );
}

function MissingPetCard({
  pet,
  onView,
  onSighting,
}: {
  pet: ApiLostPet;
  onView: () => void;
  onSighting: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover border border-primary-50">
      <div className="relative cursor-pointer" onClick={onView}>
        {pet.imageUrl
          ? <img src={pet.imageUrl || FALLBACK_PET_IMAGE} alt={pet.petName} className={MISSING_PET_IMAGE_CLASS} />
          : <div className={MISSING_PET_IMAGE_FALLBACK_CLASS}>
              <Camera className="w-10 h-10 text-primary-200" />
            </div>
        }
        <span className="absolute top-3 left-3 shadow text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
          Missing
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-gray-800">{pet.petName}</h3>
        <p className="text-xs text-gray-400 mb-1">{pet.breed || 'Unknown breed'} - {pet.type}</p>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{pet.lastSeenLocation || 'Last seen location unavailable'}</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">Reported {formatDateLabel(pet.reportedAt || pet.lastSeenDate)}</p>
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
          <button onClick={onSighting} className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Sighting
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    pets,
    applications,
    isLoading,
    fetchPets,
    selectedPet,
    adoptionStep,
    openPetDetail,
    startAdoption,
    submitApplication,
    confirmAdoption,
    closeModal,
    error,
  } = usePets();
  const [missingPets, setMissingPets] = useState<ApiLostPet[]>([]);
  const [isMissingLoading, setIsMissingLoading] = useState(true);

  useEffect(() => {
    void fetchPets();
  }, [fetchPets]);

  useEffect(() => {
    let ignore = false;

    const loadMissingPets = async () => {
      setIsMissingLoading(true);
      try {
        const data = await lostPetsApi.getAll();
        if (!ignore) {
          setMissingPets(
            data
              .filter((pet) => pet.status === 'Missing')
              .sort((a, b) => {
                const dateA = new Date(a.reportedAt || a.lastSeenDate || 0).getTime();
                const dateB = new Date(b.reportedAt || b.lastSeenDate || 0).getTime();
                return dateB - dateA;
              })
          );
        }
      } catch {
        if (!ignore) setMissingPets([]);
      } finally {
        if (!ignore) setIsMissingLoading(false);
      }
    };

    void loadMissingPets();

    return () => {
      ignore = true;
    };
  }, []);

  const pendingCount = applications.filter((application) => application.status === 'Pending').length;
  const normalizedUserEmail = user?.email?.trim().toLowerCase() || '';

  const featuredPets = useMemo(
    () =>
      [...pets]
        .filter((pet) => pet.status.trim().toLowerCase() === 'available')
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 4),
    [pets]
  );

  const recentMissingPets = useMemo(
    () => missingPets
      .filter((pet) => !isUserLostPetOwner(pet, user?.id, normalizedUserEmail))
      .slice(0, 4),
    [missingPets, normalizedUserEmail, user?.id]
  );

  const openPetFinderAction = (pet: ApiLostPet, action: 'view' | 'sighting') => {
    navigate('/dashboard/pet-finder', {
      state: {
        petFinderAction: {
          petId: pet.id,
          type: action,
        },
      },
    });
  };

  const handleViewApplications = () => {
    closeModal();
    navigate('/dashboard/applications');
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 p-6 lg:p-8 text-white shadow-lg shadow-primary-100">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold text-primary-100">
            Welcome back, {user?.fullName?.split(' ')[0] ?? 'Friend'}
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight lg:text-4xl">
            Home keeps your adoption journey and pet finder updates in one place
          </h2>
          <p className="mt-3 max-w-xl text-sm text-primary-100 lg:text-base">
            Explore recently added pets available for adoption, then check the latest missing pets that need community eyes right now.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/pet-adoption')}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary-700 transition-all hover:bg-primary-50"
            >
              Open Pet Adoption
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/pet-finder')}
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              Open Pet Finder
            </button>
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Info className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm text-amber-800">
            You have <strong>{pendingCount}</strong> pending adoption application{pendingCount > 1 ? 's' : ''}. Check the Applications tab for updates.
          </p>
        </div>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">Featured Pets</h2>
            <p className="text-sm text-gray-500">Recently added pets that are currently available for adoption.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/pet-adoption')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            See all
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-primary-100 bg-white px-6 py-14 text-center text-sm text-gray-400">
            Loading featured pets...
          </div>
        ) : featuredPets.length === 0 ? (
          <div className="rounded-2xl border border-primary-100 bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-500">
              <Heart className="h-7 w-7 fill-current" />
            </div>
            <p className="font-bold text-gray-700">No adoptable pets are available right now.</p>
            <p className="mt-1 text-sm text-gray-500">Please check back soon for recently added pets.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredPets.map((pet) => (
              <FeaturedPetCard
                key={pet.id}
                pet={pet}
                onOpen={() => openPetDetail(pet)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">Missing Pets</h2>
            <p className="text-sm text-gray-500">Recent missing pet reports to keep visible under the adoption overview.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/pet-finder')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            See all
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {isMissingLoading ? (
          <div className="rounded-2xl border border-amber-100 bg-white px-6 py-14 text-center text-sm text-gray-400">
            Loading missing pets...
          </div>
        ) : recentMissingPets.length === 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-500">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <p className="font-bold text-gray-700">No missing pets are listed right now.</p>
            <p className="mt-1 text-sm text-gray-500">Pet Finder updates will appear here when new reports come in.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentMissingPets.map((pet) => (
              <MissingPetCard
                key={pet.id}
                pet={pet}
                onView={() => openPetFinderAction(pet, 'view')}
                onSighting={() => openPetFinderAction(pet, 'sighting')}
              />
            ))}
          </div>
        )}
      </section>

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
