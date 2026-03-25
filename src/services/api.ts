const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'ab_token';
const LAST_ACTIVITY_KEY = 'ab_last_activity_at';
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const getLastActivityAt = () => Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? '0');

export const touchSessionActivity = (timestamp = Date.now()) => {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
};

export const isSessionExpired = (now = Date.now()) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  const lastActivityAt = getLastActivityAt();
  if (!lastActivityAt) return false;
  return now - lastActivityAt >= INACTIVITY_TIMEOUT_MS;
};

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const lastActivityAt = getLastActivityAt();
  if (lastActivityAt && isSessionExpired()) {
    clearToken();
    return null;
  }

  if (!lastActivityAt) {
    touchSessionActivity();
  }

  return token;
};

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  touchSessionActivity();
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (auth) { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`; }
  const res  = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

const api = {
  get:    <T>(p: string, auth = true) => request<T>('GET',    p, undefined, auth),
  post:   <T>(p: string, b: unknown, auth = true) => request<T>('POST',   p, b, auth),
  put:    <T>(p: string, b: unknown, auth = true) => request<T>('PUT',    p, b, auth),
  delete: <T>(p: string, auth = true) => request<T>('DELETE', p, undefined, auth),
};

export const authApi = {
  login:          (email: string, password: string) =>
    api.post<{ token: string; user: ApiUser }>('/auth/login', { email, password }, false),
  sendOtp:        (email: string) =>
    api.post<AuthOtpResponse>('/auth/send-otp', { email }, false),
  sendResetOtp:   (email: string) =>
    api.post<AuthOtpResponse>('/auth/send-reset-otp', { email }, false),
  verifyOtp:      (email: string, otp: string) =>
    api.post<AuthVerifyOtpResponse>('/auth/verify-otp', { email, otp }, false),
  verifyResetOtp: (email: string, otp: string) =>
    api.post<AuthVerifyResetOtpResponse>('/auth/verify-reset-otp', { email, otp }, false),
  register:       (fullName: string, email: string, password: string, phone: string, address: string) =>
    api.post<{ token: string; user: ApiUser }>(
      '/auth/register',
      { fullName, email, password, phone, address },
      false
    ),
  resetPassword:  (resetToken: string, newPassword: string, confirmPassword: string) =>
    api.post<{ message: string }>(
      '/auth/reset-password',
      { resetToken, newPassword, confirmPassword },
      false
    ),
  me:             () => api.get<ApiUser>('/auth/me'),
  updateMe:       (data: Partial<ApiUser>) => api.put<ApiUser>('/auth/me', data),
  deleteMe:       (password: string) => request<{ message: string }>('DELETE', '/auth/me', { password }),
  uploadProfilePhoto: (data: FormData) => api.post<ApiPhotoUploadResponse>('/users/profile-photo', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
};

export const notificationApi = {
  getAll: (scope: NotificationScope = 'user') =>
    api.get<ApiNotificationsResponse>(`/notifications?scope=${encodeURIComponent(scope)}`),
};

export const petsApi = {
  getAll: (params?: { type?: string; search?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type && params.type !== 'All') qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return api.get<ApiPet[]>(`/pets${q ? `?${q}` : ''}`, false);
  },
  getById: (id: string | number) => api.get<ApiPet>(`/pets/${id}`, false),
};

export const appsApi = {
  submit: (data: ApplicationPayload) => api.post<ApiApplication>('/applications', data),
  getMy:  () => api.get<ApiApplication[]>('/applications/my'),
};

export const lostPetsApi = {
  getAll: (params?: { search?: string }) => {
    const qs = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return api.get<ApiLostPet[]>(`/lost-pets${qs}`, false);
  },
  getById:        (id: string | number) => api.get<ApiLostPet>(`/lost-pets/${id}`, false),
  getSightings:   (id: string | number) => api.get<ApiSighting[]>(`/lost-pets/${id}/sightings`, false),
  reportMissing:  (data: FormData) => api.post<ApiLostPet>('/lost-pets', data),
  markFound:      (id: string | number) => api.put<ApiLostPet>(`/lost-pets/${id}/found`, {}),
  reportSighting: (lostPetId: string | number, data: SightingPayload) =>
    api.post<ApiSighting>(`/lost-pets/${lostPetId}/sightings`, data),
};

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/dashboard'),

  getUsers:      (search?: string) => api.get<ApiUser[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getUser:       (id: number) => api.get<ApiUser>(`/admin/users/${id}`),
  updateUser:    (id: number, data: Partial<ApiUser>) => api.put<ApiUser>(`/admin/users/${id}`, data),
  deleteUser:    (id: number) => api.delete<{ message: string }>(`/admin/users/${id}`),
  resetPassword: (id: number, newPassword: string) => api.put<{ message: string }>(`/admin/users/${id}/reset-password`, { newPassword }),

  getPets:   (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return api.get<ApiPet[]>(`/admin/pets${qs ? `?${qs}` : ''}`);
  },
  createPet: (data: Partial<ApiPet>) => api.post<ApiPet>('/admin/pets', data),
  updatePet: (id: number, data: Partial<ApiPet>) => api.put<ApiPet>(`/admin/pets/${id}`, data),
  deletePet: (id: number) => api.delete<{ message: string }>(`/admin/pets/${id}`),

  getApplications: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return api.get<ApiApplication[]>(`/admin/applications${qs ? `?${qs}` : ''}`);
  },
  updateAppStatus: (id: number, status: string, remark: string) =>
    api.put<ApiApplication>(`/admin/applications/${id}`, { status, remark }),

  resetPetAdoption: (petId: number) =>
    api.post<{ message: string }>(`/admin/pets/${petId}/reset-adoption`, {}),

  getLostPets:         (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return api.get<ApiAdminLostPet[]>(`/admin/lost-pets${qs ? `?${qs}` : ''}`);
  },
  updateLostPetStatus: (id: number, status: string) => api.put<{ id: number; status: string }>(`/admin/lost-pets/${id}`, { status }),
  deleteLostPet:       (id: number) => api.delete<{ message: string }>(`/admin/lost-pets/${id}`),

  // Sightings
  getSightings:   (lostPetId?: number) => {
    const qs = lostPetId ? `?lostPetId=${lostPetId}` : '';
    return api.get<ApiAdminSighting[]>(`/admin/sightings${qs}`);
  },
  deleteSighting: (id: number) => api.delete<{ message: string }>(`/admin/sightings/${id}`),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: number; fullName: string; email: string; phone?: string;
  address?: string; avatarUrl?: string | null; newPetEmailNotificationsEnabled?: boolean;
  role: 'user' | 'admin'; joinedAt?: string;
}
export interface ApiPhotoUploadResponse {
  success: boolean;
  message?: string;
  photoUrl?: string;
  photo_url?: string;
}
export interface AuthOtpResponse {
  message: string;
  expiresInSeconds: number;
  devOtp?: string;
  devHint?: string;
}
export interface AuthVerifyOtpResponse {
  message: string;
  verified: boolean;
}
export interface AuthVerifyResetOtpResponse extends AuthVerifyOtpResponse {
  resetToken: string;
  expiresInSeconds: number;
}
export type NotificationScope = 'user' | 'admin';
export type NotificationKind =
  | 'application_pending'
  | 'application_approved'
  | 'application_rejected'
  | 'sighting_reported'
  | 'lost_pet_found';
export interface ApiNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  route: string;
}
export interface ApiNotificationsResponse {
  scope: NotificationScope;
  notifications: ApiNotification[];
}
export interface ApiPet {
  id: number; name: string; type: string; breed: string; gender: string; age: string;
  weight: string; colorAppearance: string; description: string; distinctiveFeatures?: string;
  imageUrl?: string; status: string; shelterName?: string; shelterEmail?: string;
  shelterPhone?: string; location?: string; createdAt?: string;
}
export interface ApiApplication {
  id: number; petId: number; petName: string; petImageUrl?: string; petType: string;
  userId?: number; fullName: string; email: string; phone: string; homeAddress: string;
  previousPetExperience: string; whyAdopt: string; whyChooseYou: string;
  adminRemark?: string;
  status: 'Pending' | 'Approved' | 'Rejected'; submittedAt: string; updatedAt: string;
}
export interface ApiLostPet {
  id: number; petName: string; type: string; breed: string; gender: string;
  age?: string; weight?: string; colorAppearance: string; description: string;
  distinctiveFeatures?: string; imageUrl?: string; lastSeenLocation: string;
  lastSeenDate: string; rewardOffered?: string; ownerName: string;
  ownerEmail: string; ownerPhone: string; reportedById?: number;
  status: 'Missing' | 'Found'; reportedAt: string;
}
export interface ApiAdminLostPet extends ApiLostPet {
  sightingCount: number;
}
export interface ApiSighting {
  id: number; lostPetId: number; reporterName: string; reporterEmail: string;
  reporterPhone: string; locationSeen: string; dateSeen: string; description: string;
  address?: string; latitude?: number; longitude?: number;
  imageUrl?: string; reportedAt: string;
}
export interface ApiAdminSighting {
  id: number; lostPetId: number;
  petName: string; petType: string; petBreed: string; petImageUrl?: string; petStatus: string;
  reporterName: string; reporterEmail: string; reporterPhone: string;
  locationSeen: string; address?: string; latitude?: number; longitude?: number;
  dateSeen: string; description: string; reportedAt: string;
}
export interface AdminStats {
  totalUsers: number; availablePets: number; pendingApps: number;
  missingPets: number; totalSightings: number;
  recentApplications: Array<{
    id: number; status: string; submitted_at: string;
    full_name: string; pet_name: string; pet_type: string;
  }>;
  recentSightings: Array<{
    id: number; reporter_name: string; location_seen: string;
    date_seen: string; reported_at: string; pet_name: string; pet_type: string;
  }>;
}
export interface ApplicationPayload {
  petId: number; fullName: string; email: string; phone: string; homeAddress: string;
  previousPetExperience: string; whyAdopt: string; whyChooseYou: string;
}
export interface MissingPetPayload {
  petName: string; type: string; breed: string; gender: string; age?: string; weight?: string;
  colorAppearance: string; description: string; distinctiveFeatures?: string; imageUrl?: string;
  lastSeenLocation: string; lastSeenDate: string; rewardOffered?: string;
  ownerName: string; ownerEmail: string; ownerPhone: string;
}
export interface SightingPayload {
  reporterName: string; reporterEmail: string; reporterPhone: string;
  locationSeen: string; dateSeen: string; description: string; imageUrl?: string;
  latitude?: number; longitude?: number;
}
