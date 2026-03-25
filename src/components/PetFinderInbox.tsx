import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AppContext';
import { ApiLostPet, ApiSighting, lostPetsApi } from '../services/api';

type PetFinderInboxProps = {
  hidden?: boolean;
};

type SightingThread = {
  pet: ApiLostPet;
  sightings: ApiSighting[];
  latestSighting: ApiSighting;
};

const READ_STORAGE_PREFIX = 'ab_pet_finder_inbox_reads';

function getReadStorageKey(userId: number) {
  return `${READ_STORAGE_PREFIX}:${userId}`;
}

function getStoredReadIds(userId: number) {
  try {
    const raw = localStorage.getItem(getReadStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'number') : [];
  } catch {
    return [];
  }
}

function saveReadIds(userId: number, readIds: number[]) {
  localStorage.setItem(getReadStorageKey(userId), JSON.stringify(readIds));
}

function isLostPetOwner(
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

function sortSightingsNewestFirst(left: ApiSighting, right: ApiSighting) {
  return new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime();
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildGmailComposeUrl(email?: string) {
  const normalizedEmail = email?.trim();
  return normalizedEmail
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(normalizedEmail)}`
    : null;
}

export default function PetFinderInbox({ hidden = false }: PetFinderInboxProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<SightingThread[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [readIds, setReadIds] = useState<number[]>([]);

  const userId = user?.id ?? null;
  const normalizedUserEmail = user?.email?.trim().toLowerCase() || '';

  const fetchThreads = useCallback(async () => {
    if (!userId) {
      setThreads([]);
      return;
    }

    setIsLoading(true);
    try {
      const allLostPets = await lostPetsApi.getAll();
      const ownedMissingPets = allLostPets.filter((pet) => (
        pet.status === 'Missing' &&
        isLostPetOwner(pet, userId, normalizedUserEmail)
      ));

      if (ownedMissingPets.length === 0) {
        setThreads([]);
        return;
      }

      const nextThreads = (await Promise.all(
        ownedMissingPets.map(async (pet) => {
          const sightings = (await lostPetsApi.getSightings(pet.id)).sort(sortSightingsNewestFirst);
          if (sightings.length === 0) return null;

          return {
            pet,
            sightings,
            latestSighting: sightings[0],
          } satisfies SightingThread;
        })
      ))
        .filter((thread): thread is SightingThread => Boolean(thread))
        .sort((left, right) => sortSightingsNewestFirst(left.latestSighting, right.latestSighting));

      setThreads(nextThreads);

      const availableSightingIds = new Set(
        nextThreads.flatMap((thread) => thread.sightings.map((sighting) => sighting.id))
      );
      const nextReadIds = getStoredReadIds(userId).filter((id) => availableSightingIds.has(id));
      setReadIds(nextReadIds);
      saveReadIds(userId, nextReadIds);
    } catch {
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }, [normalizedUserEmail, userId]);

  useEffect(() => {
    if (!userId || hidden) return undefined;

    void fetchThreads();

    const intervalId = window.setInterval(() => {
      void fetchThreads();
    }, 60000);

    const handleWindowFocus = () => {
      void fetchThreads();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchThreads, hidden, userId]);

  useEffect(() => {
    if (!userId) {
      setReadIds([]);
      return;
    }

    setReadIds(getStoredReadIds(userId));
  }, [userId]);

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedPetId(null);
      return;
    }

    if (selectedPetId && threads.some((thread) => thread.pet.id === selectedPetId)) {
      return;
    }

    setSelectedPetId(threads[0].pet.id);
  }, [selectedPetId, threads]);

  useEffect(() => {
    if (hidden) return;
    void fetchThreads();
  }, [fetchThreads, hidden, location.pathname]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.pet.id === selectedPetId) ?? null,
    [selectedPetId, threads]
  );

  const unreadCount = useMemo(
    () => threads.flatMap((thread) => thread.sightings).filter((sighting) => !readIds.includes(sighting.id)).length,
    [readIds, threads]
  );

  const markThreadAsRead = useCallback((thread: SightingThread | null) => {
    if (!userId || !thread) return;

    const nextReadIds = Array.from(new Set([
      ...readIds,
      ...thread.sightings.map((sighting) => sighting.id),
    ]));

    setReadIds(nextReadIds);
    saveReadIds(userId, nextReadIds);
  }, [readIds, userId]);

  useEffect(() => {
    if (!isOpen || !selectedThread) return;
    markThreadAsRead(selectedThread);
  }, [isOpen, markThreadAsRead, selectedThread]);

  if (hidden || threads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <div className="flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-2xl shadow-primary-900/10">
          <div className="flex items-center justify-between border-b border-primary-100 bg-primary-50/80 px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-gray-900">Pet Finder Inbox</p>
              <p className="text-xs text-gray-500">
                {isLoading
                  ? 'Refreshing sighting updates...'
                  : unreadCount > 0
                    ? `${unreadCount} new update${unreadCount === 1 ? '' : 's'}`
                    : 'Sighting updates for your reports'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
              aria-label="Close Pet Finder inbox"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[9rem_1fr]">
            <div className="overflow-y-auto border-r border-primary-100 bg-primary-50/40">
              {isLoading && (
                <div className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-primary-600">
                  <Clock3 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing
                </div>
              )}
              {threads.map((thread) => {
                const threadUnreadCount = thread.sightings.filter((sighting) => !readIds.includes(sighting.id)).length;
                const isActive = selectedPetId === thread.pet.id;

                return (
                  <button
                    key={thread.pet.id}
                    type="button"
                    onClick={() => {
                      setSelectedPetId(thread.pet.id);
                      markThreadAsRead(thread);
                    }}
                    className={`w-full border-b border-primary-100/80 px-3 py-3 text-left transition-colors ${
                      isActive ? 'bg-white' : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{thread.pet.petName}</p>
                        <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(thread.latestSighting.reportedAt)}</p>
                      </div>
                      {threadUnreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                          {threadUnreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {thread.latestSighting.locationSeen}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex min-h-0 flex-col">
              {selectedThread ? (
                <>
                  <div className="border-b border-primary-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{selectedThread.pet.petName}</p>
                        <p className="truncate text-xs text-gray-500">
                          {selectedThread.pet.breed} • {selectedThread.pet.type}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/dashboard/pet-finder', {
                            state: { petFinderAction: { petId: selectedThread.pet.id, type: 'view' } },
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary-100 px-3 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-200"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-primary-50/20 px-4 py-4">
                    {selectedThread.sightings.map((sighting) => {
                      const gmailComposeUrl = buildGmailComposeUrl(sighting.reporterEmail);

                      return (
                        <div key={sighting.id} className="flex">
                          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-primary-100 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{sighting.reporterName}</p>
                                <p className="text-[11px] text-gray-400">{formatMessageTime(sighting.reportedAt)}</p>
                              </div>
                              {!readIds.includes(sighting.id) && (
                                <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                              )}
                            </div>

                            <div className="mt-3 space-y-2 text-sm text-gray-600">
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                                <p>{sighting.locationSeen}</p>
                              </div>
                              <p className="leading-relaxed">{sighting.description}</p>
                            </div>

                            <div className="mt-3 space-y-2 border-t border-primary-50 pt-3">
                              {gmailComposeUrl && (
                                <a
                                  href={gmailComposeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-800"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="truncate">{sighting.reporterEmail}</span>
                                </a>
                              )}
                              {sighting.reporterPhone && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{sighting.reporterPhone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
                  Select a missing pet report to view sighting messages.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            if (!selectedThread && threads[0]) {
              setSelectedPetId(threads[0].pet.id);
            }
          }}
          className="group flex items-center gap-3 rounded-full bg-primary-600 px-4 py-3 text-white shadow-xl shadow-primary-700/25 transition-all hover:bg-primary-700"
          aria-label="Open Pet Finder inbox"
        >
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold">Pet Finder Inbox</p>
            <p className="text-[11px] text-white/80">
              {unreadCount > 0 ? `${unreadCount} sighting update${unreadCount === 1 ? '' : 's'}` : 'View your latest sightings'}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
