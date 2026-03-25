import { useState, useEffect } from 'react';
import { lostPetsApi, ApiLostPet, ApiSighting, MissingPetPayload, SightingPayload } from '../services/api';
import { formatWeightForStorage } from '../utils/petWeight';

export type FinderView = 'list' | 'detail' | 'report-missing' | 'report-sighting' | 'confirm-report';

export function usePetFinderViewModel() {
  const [lostPets, setLostPets]             = useState<ApiLostPet[]>([]);
  const [sightings, setSightings]           = useState<ApiSighting[]>([]);
  const [activeView, setActiveView]         = useState<FinderView>('list');
  const [selectedLostPet, setSelectedLostPet] = useState<ApiLostPet | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isLoading, setIsLoading]           = useState(true);
  const [reportType, setReportType]         = useState<'missing' | 'sighting'>('missing');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [isUpdatingPetStatus, setIsUpdatingPetStatus] = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [successNotice, setSuccessNotice]   = useState<string | null>(null);

  useEffect(() => { fetchLostPets(); }, []);

  const fetchLostPets = async () => {
    setIsLoading(true);
    try { setLostPets(await lostPetsApi.getAll()); }
    catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  const filteredPets = lostPets.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q
      || p.petName.toLowerCase().includes(q)
      || p.breed.toLowerCase().includes(q)
      || p.type.toLowerCase().includes(q);
  });

  const viewDetail = async (pet: ApiLostPet) => {
    setSuccessNotice(null);
    setSubmitError(null);
    setSelectedLostPet(pet);
    setActiveView('detail');
    try { setSightings(await lostPetsApi.getSightings(pet.id)); }
    catch { setSightings([]); }
  };

  const openReportMissing = () => {
    setReportType('missing');
    setSubmitError(null);
    setSuccessNotice(null);
    setActiveView('report-missing');
  };

  const openReportSighting = (pet?: ApiLostPet | null) => {
    setSelectedLostPet(pet ?? null);
    setReportType('sighting');
    setSubmitError(null);
    setSuccessNotice(null);
    setActiveView('report-sighting');
  };

  const submitMissingReport = async (data: MissingPetPayload & { imageFile?: File | null }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('petName', data.petName);
      formData.append('type', data.type);
      formData.append('breed', data.breed);
      formData.append('gender', data.gender);
      formData.append('age', data.age || '');
      formData.append('weight', formatWeightForStorage(data.weight));
      formData.append('colorAppearance', data.colorAppearance);
      formData.append('description', data.description);
      formData.append('distinctiveFeatures', data.distinctiveFeatures || '');
      formData.append('lastSeenLocation', data.lastSeenLocation);
      formData.append('lastSeenDate', data.lastSeenDate);
      formData.append('rewardOffered', data.rewardOffered || '');
      formData.append('ownerName', data.ownerName);
      formData.append('ownerEmail', data.ownerEmail);
      formData.append('ownerPhone', data.ownerPhone);

      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }

      const newPet = await lostPetsApi.reportMissing(formData);
      setLostPets(p => [newPet, ...p]);
      setSelectedLostPet(newPet);
      setSightings([]);
      setActiveView('confirm-report');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // lostPetId can now be passed explicitly so sighting works without a pre-selected pet
  const submitSightingReport = async (
    data: SightingPayload,
    lostPetId?: number,
  ) => {
    const targetId = lostPetId ?? selectedLostPet?.id;
    if (!targetId) {
      setSubmitError('Please select which pet you spotted.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const newSighting = await lostPetsApi.reportSighting(targetId, data);
      setSightings(s => [newSighting, ...s]);
      setSuccessNotice('Sighting Reported Successfully');
      setActiveView('confirm-report');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit sighting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markLostPetAsFound = async (lostPetId: number) => {
    setIsUpdatingPetStatus(true);
    setSubmitError(null);

    try {
      const updatedPet = await lostPetsApi.markFound(lostPetId);

      setLostPets((current) => current.map((pet) => (
        pet.id === lostPetId ? updatedPet : pet
      )));
      setSelectedLostPet((current) => (
        current?.id === lostPetId ? updatedPet : current
      ));
      setSuccessNotice(`${updatedPet.petName} marked as found.`);
      setActiveView('list');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update report status.');
    } finally {
      setIsUpdatingPetStatus(false);
    }
  };

  const confirmReport = () => {
    if (reportType === 'missing' && selectedLostPet) {
      setActiveView('detail');
      return;
    }

    setActiveView('list');
    setSelectedLostPet(null);
  };
  const goBack        = () => setActiveView('list');
  const clearSuccessNotice = () => setSuccessNotice(null);

  return {
    lostPets, sightings, filteredPets, activeView, selectedLostPet,
    searchQuery, setSearchQuery, isLoading, isSubmitting, isUpdatingPetStatus, submitError, reportType, successNotice,
    viewDetail, openReportMissing, openReportSighting,
    submitMissingReport, submitSightingReport, markLostPetAsFound, confirmReport, goBack, clearSuccessNotice,
  };
}
