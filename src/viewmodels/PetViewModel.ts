import { useState, useEffect, useMemo, useCallback } from 'react';
import { petsApi, appsApi, ApiPet, ApiApplication } from '../services/api';

export type PetTypeFilter = 'All' | 'Dogs' | 'Cats' | 'Birds' | 'Small Animals' | 'Reptiles' | 'Others';

const PENDING_APPLICATION_ERROR = 'You already have a pending application for this pet.';

const hasPendingApplicationForPet = (petId: number, applications: ApiApplication[]) =>
  applications.some(app => app.petId === petId && app.status.toLowerCase() === 'pending');

export function usePetViewModel() {
  const [pets, setPets] = useState<ApiPet[]>([]);
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PetTypeFilter>('All');
  const [selectedPet, setSelectedPet] = useState<ApiPet | null>(null);
  const [adoptionStep, setAdoptionStep] = useState<'detail' | 'application' | 'verification' | 'success' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAppData, setPendingAppData] = useState<Record<string, string> | null>(null);

  const fetchPets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await petsApi.getAll({ status: 'Available' });
      setPets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load pets on mount
  useEffect(() => {
    void fetchPets();
  }, [fetchPets]);

  // Load user's applications
  const fetchApplications = useCallback(async () => {
    try {
      const data = await appsApi.getMy();
      setApplications(data);
    } catch { /* not logged in yet */ }
  }, []);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const isAvailable = pet.status.trim().toLowerCase() === 'available';
      const normalizedPetType = pet.type.trim().toLowerCase();
      const matchesType = selectedType === 'All'
        || pet.type === selectedType
        || (
          selectedType === 'Others'
          && (normalizedPetType === 'other' || normalizedPetType === 'others')
        );
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || pet.name.toLowerCase().includes(q) || pet.breed.toLowerCase().includes(q) || pet.type.toLowerCase().includes(q);
      return isAvailable && matchesType && matchesSearch;
    });
  }, [pets, searchQuery, selectedType]);

  const openPetDetail = (pet: ApiPet) => {
    setSelectedPet(pet);
    setPendingAppData(null);
    setError(null);
    setAdoptionStep('detail');
  };

  const startAdoption = () => {
    if (!selectedPet) return;

    if (hasPendingApplicationForPet(selectedPet.id, applications)) {
      setError(PENDING_APPLICATION_ERROR);
      return;
    }

    setError(null);
    setAdoptionStep('application');
  };

  const submitApplication = (formData: Record<string, string>) => {
    setError(null);
    setPendingAppData(formData);
    setAdoptionStep('verification');
  };

  const confirmAdoption = async () => {
    if (!selectedPet || !pendingAppData) return;
    try {
      const newApp = await appsApi.submit({
        petId:                 selectedPet.id,
        fullName:              pendingAppData.fullName,
        email:                 pendingAppData.email,
        phone:                 pendingAppData.phone,
        homeAddress:           pendingAppData.homeAddress,
        previousPetExperience: pendingAppData.previousPetExperience,
        whyAdopt:              pendingAppData.whyAdopt,
        whyChooseYou:          pendingAppData.whyChooseYou,
      });
      setApplications(a => [newApp, ...a]);
      setError(null);
      setAdoptionStep('success');
      setPendingAppData(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit application.';
      setError(message);

      if (message === PENDING_APPLICATION_ERROR) {
        setPendingAppData(null);
        setAdoptionStep('detail');
        void fetchApplications();
      }
    }
  };

  const closeModal = () => {
    setSelectedPet(null);
    setAdoptionStep(null);
    setPendingAppData(null);
    setError(null);
  };

  return {
    pets, filteredPets, applications, isLoading, error,
    searchQuery, setSearchQuery, selectedType, setSelectedType,
    selectedPet, adoptionStep,
    openPetDetail, startAdoption, submitApplication, confirmAdoption, closeModal,
    fetchPets, fetchApplications,
  };
}
