import { useCallback, useEffect, useState } from 'react';
import {
  authApi,
  ApiUser,
  clearToken,
  getStoredToken,
  getToken,
  INACTIVITY_LOGOUT_MESSAGE,
  isSessionExpired,
  onAuthInvalidated,
  setToken,
  touchSessionActivity,
} from '../services/api';

export interface AuthState {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'click',
  'keydown',
  'pointerdown',
  'scroll',
  'touchstart',
];

const SESSION_CHECK_INTERVAL_MS = 15_000;

export function useAuthViewModel() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const logout = useCallback((reason: string | null = null) => {
    clearToken();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: reason,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(current => ({ ...current, error: null }));
  }, []);

  const logoutForInactivity = useCallback(() => {
    logout(INACTIVITY_LOGOUT_MESSAGE);
  }, [logout]);

  const refreshUser = useCallback(async (): Promise<ApiUser | null> => {
    try {
      const user = await authApi.me();
      touchSessionActivity();
      setState(current => ({
        ...current,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
      return user;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    const hadStoredToken = Boolean(getStoredToken());
    const expiredSession = hadStoredToken && isSessionExpired();
    const token = getToken();
    if (!token) {
      if (expiredSession) {
        logoutForInactivity();
        return;
      }

      logout();
      return;
    }

    void refreshUser();
  }, [logout, logoutForInactivity, refreshUser]);

  useEffect(() => {
    const unsubscribe = onAuthInvalidated((reason) => {
      if (reason === 'expired') {
        logoutForInactivity();
        return;
      }
      logout();
    });

    return unsubscribe;
  }, [logout, logoutForInactivity]);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const endExpiredSession = () => {
      if (isSessionExpired()) {
        logoutForInactivity();
      }
    };

    const handleActivity = () => {
      if (document.hidden) return;
      if (isSessionExpired()) {
        logoutForInactivity();
        return;
      }
      touchSessionActivity();
    };

    const handleFocusOrVisibility = () => {
      if (document.hidden) return;
      if (isSessionExpired()) {
        logoutForInactivity();
        return;
      }
      touchSessionActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ab_token' && !event.newValue) {
        logout();
        return;
      }
      endExpiredSession();
    };

    touchSessionActivity();

    ACTIVITY_EVENTS.forEach(eventName => {
      window.addEventListener(eventName, handleActivity);
    });
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);
    window.addEventListener('storage', handleStorage);

    const intervalId = window.setInterval(endExpiredSession, SESSION_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(intervalId);
    };
  }, [logout, logoutForInactivity, state.isAuthenticated]);

  const login = useCallback(async (email: string, password: string): Promise<'admin' | 'user' | null> => {
    setState(current => ({ ...current, isLoading: true, error: null }));
    try {
      const { token, user } = await authApi.login(email, password);
      setToken(token);
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
      return user.role;
    } catch (err: unknown) {
      setState(current => ({
        ...current,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed.',
      }));
      return null;
    }
  }, []);

  const signup = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    phone: string,
    address: string
  ): Promise<boolean> => {
    setState(current => ({ ...current, isLoading: true, error: null }));
    try {
      const { token, user } = await authApi.register(fullName, email, password, phone, address);
      setToken(token);
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (err: unknown) {
      setState(current => ({
        ...current,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Signup failed.',
      }));
      return false;
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<ApiUser>): Promise<boolean> => {
    try {
      const updated = await authApi.updateMe(updates);
      setState(current => ({
        ...current,
        user: current.user ? { ...current.user, ...updated } : updated,
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { ...state, login, signup, logout, updateUser, refreshUser, clearError };
}
