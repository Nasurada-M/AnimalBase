import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth, usePets } from '../context/AppContext';
import {
  ApiNotification,
  notificationApi,
  NotificationKind,
  NotificationScope,
} from '../services/api';

type NotificationBellProps = {
  scope: NotificationScope;
  variant?: 'dashboard' | 'admin';
};

const READ_STORAGE_PREFIX = 'ab_notification_reads';
const CLEARED_STORAGE_PREFIX = 'ab_notification_cleared';

const buttonClasses = {
  dashboard: 'relative w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 hover:bg-primary-100 transition-colors',
  admin: 'relative w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors',
};

function getStorageKey(prefix: string, userId: number, scope: NotificationScope) {
  return `${prefix}:${userId}:${scope}`;
}

function getStoredIds(prefix: string, userId: number, scope: NotificationScope) {
  try {
    const raw = localStorage.getItem(getStorageKey(prefix, userId, scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function getReadIds(userId: number, scope: NotificationScope) {
  return getStoredIds(READ_STORAGE_PREFIX, userId, scope);
}

function saveReadIds(userId: number, scope: NotificationScope, readIds: string[]) {
  localStorage.setItem(getStorageKey(READ_STORAGE_PREFIX, userId, scope), JSON.stringify(readIds));
}

function getClearedIds(userId: number, scope: NotificationScope) {
  return getStoredIds(CLEARED_STORAGE_PREFIX, userId, scope);
}

function saveClearedIds(userId: number, scope: NotificationScope, clearedIds: string[]) {
  localStorage.setItem(
    getStorageKey(CLEARED_STORAGE_PREFIX, userId, scope),
    JSON.stringify(clearedIds)
  );
}

function formatTimeLabel(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getNotificationMeta(kind: NotificationKind) {
  switch (kind) {
    case 'application_approved':
      return {
        Icon: CheckCircle2,
        chip: 'Application',
        iconClass: 'text-emerald-600',
        iconBg: 'bg-emerald-100',
      };
    case 'application_rejected':
      return {
        Icon: XCircle,
        chip: 'Application',
        iconClass: 'text-red-600',
        iconBg: 'bg-red-100',
      };
    case 'application_pending':
      return {
        Icon: FileText,
        chip: 'Application',
        iconClass: 'text-amber-600',
        iconBg: 'bg-amber-100',
      };
    case 'lost_pet_found':
      return {
        Icon: Search,
        chip: 'Pet Finder',
        iconClass: 'text-primary-600',
        iconBg: 'bg-primary-100',
      };
    case 'sighting_reported':
    default:
      return {
        Icon: Eye,
        chip: 'Sighting',
        iconClass: 'text-blue-600',
        iconBg: 'bg-blue-100',
      };
  }
}

function getNotificationTargetRoute(
  notification: ApiNotification,
  scope: NotificationScope
) {
  if (scope === 'admin') {
    if (notification.kind === 'application_pending') {
      return '/admin/applications';
    }

    if (
      notification.kind === 'application_approved'
      || notification.kind === 'application_rejected'
    ) {
      return '/admin/applications';
    }

    if (notification.kind === 'sighting_reported') {
      return '/admin/sightings';
    }
  }

  if (scope === 'user') {
    if (
      notification.kind === 'application_pending'
      || notification.kind === 'application_approved'
      || notification.kind === 'application_rejected'
    ) {
      return '/dashboard/applications';
    }

    if (
      notification.kind === 'sighting_reported'
      || notification.kind === 'lost_pet_found'
    ) {
      return '/dashboard/pet-finder';
    }
  }

  return notification.route;
}

export default function NotificationBell({
  scope,
  variant = 'dashboard',
}: NotificationBellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { fetchApplications } = usePets();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [error, setError] = useState('');
  const [readIds, setReadIds] = useState<string[]>([]);
  const [clearedIds, setClearedIds] = useState<string[]>([]);

  const userId = user?.id ?? null;

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !clearedIds.includes(notification.id)),
    [notifications, clearedIds]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((notification) => !readIds.includes(notification.id)).length,
    [visibleNotifications, readIds]
  );

  const readCount = useMemo(
    () => visibleNotifications.filter((notification) => readIds.includes(notification.id)).length,
    [visibleNotifications, readIds]
  );

  const persistReadIds = (nextReadIds: string[]) => {
    if (!userId) return;
    setReadIds(nextReadIds);
    saveReadIds(userId, scope, nextReadIds);
  };

  const persistClearedIds = (nextClearedIds: string[]) => {
    if (!userId) return;
    setClearedIds(nextClearedIds);
    saveClearedIds(userId, scope, nextClearedIds);
  };

  const markAsRead = (notificationId: string) => {
    if (readIds.includes(notificationId)) return;
    persistReadIds([...readIds, notificationId]);
  };

  const markAllAsRead = () => {
    persistReadIds(
      Array.from(new Set([...readIds, ...visibleNotifications.map((notification) => notification.id)]))
    );
  };

  const clearNotification = (notificationId: string) => {
    if (!readIds.includes(notificationId)) {
      persistReadIds([...readIds, notificationId]);
    }

    if (!clearedIds.includes(notificationId)) {
      persistClearedIds([...clearedIds, notificationId]);
    }
  };

  const clearAllReadNotifications = () => {
    const readNotificationIds = visibleNotifications
      .filter((notification) => readIds.includes(notification.id))
      .map((notification) => notification.id);

    if (readNotificationIds.length === 0) return;

    persistClearedIds(Array.from(new Set([...clearedIds, ...readNotificationIds])));
  };

  const fetchNotifications = async (showSpinner = false) => {
    if (!userId) return;

    if (showSpinner) setIsLoading(true);
    try {
      const response = await notificationApi.getAll(scope);
      const nextNotifications = response.notifications;
      const availableIds = new Set(nextNotifications.map((notification) => notification.id));
      const nextReadIds = getReadIds(userId, scope).filter((id) => availableIds.has(id));
      const nextClearedIds = getClearedIds(userId, scope).filter((id) => availableIds.has(id));

      setNotifications(nextNotifications);
      setReadIds(nextReadIds);
      setClearedIds(nextClearedIds);
      saveReadIds(userId, scope, nextReadIds);
      saveClearedIds(userId, scope, nextClearedIds);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setReadIds([]);
      setClearedIds([]);
      setIsLoading(false);
      return;
    }

    setReadIds(getReadIds(userId, scope));
    setClearedIds(getClearedIds(userId, scope));
    setIsLoading(true);
    fetchNotifications(true);

    const intervalId = window.setInterval(() => {
      fetchNotifications(false);
    }, 60000);

    const handleWindowFocus = () => {
      fetchNotifications(false);
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [userId, scope]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleBellClick = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications(false);
    }
  };

  const refreshDataForNotificationRoute = (notification: ApiNotification) => {
    const targetRoute = getNotificationTargetRoute(notification, scope);

    if (scope === 'user' && targetRoute === '/dashboard/applications') {
      void fetchApplications();
    }
  };

  const handleNotificationClick = (notification: ApiNotification) => {
    const targetRoute = getNotificationTargetRoute(notification, scope);

    markAsRead(notification.id);
    refreshDataForNotificationRoute(notification);
    setIsOpen(false);

    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className={buttonClasses[variant]}
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-primary-100 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary-100 bg-primary-50/70">
            <div>
              <p className="font-display font-bold text-gray-900 text-sm">Notifications</p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {visibleNotifications.length > 0 && (unreadCount > 0 || readCount > 0) && (
              <div className="flex flex-col items-end gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                {readCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllReadNotifications}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear all read
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                <Clock3 className="w-5 h-5 animate-spin text-primary-400" />
                Loading notifications...
              </div>
            )}

            {!isLoading && error && (
              <div className="px-4 py-8 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            {!isLoading && !error && visibleNotifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            )}

            {!isLoading && !error && visibleNotifications.map((notification) => {
              const isUnread = !readIds.includes(notification.id);
              const { Icon, chip, iconClass, iconBg } = getNotificationMeta(notification.kind);

              return (
                <div
                  key={notification.id}
                  className={`border-b border-primary-50 last:border-b-0 transition-colors ${
                    isUnread ? 'bg-primary-50/60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2 px-4 py-3 hover:bg-primary-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            <Icon className={`w-4 h-4 ${iconClass}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary-500">
                                    {chip}
                                  </span>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className={`text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                  {notification.title}
                                </p>
                              </div>
                              <span className="text-[11px] text-gray-400 flex-shrink-0">
                                {formatTimeLabel(notification.createdAt)}
                              </span>
                            </div>
                            <p className={`mt-1 text-xs leading-relaxed ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </button>

                      <div className="mt-2 grid grid-cols-2 gap-2 pl-[3.25rem]">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary-600 hover:bg-primary-100 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Mark read
                          </button>
                        ) : (
                          <span className="inline-flex w-full items-center justify-center rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-400">
                            Read
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => clearNotification(notification.id)}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          aria-label={`Clear ${notification.title}`}
                        >
                          <X className="w-3 h-3" />
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
