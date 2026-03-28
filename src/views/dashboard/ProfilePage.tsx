import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { User, Edit3, Save, X, ChevronRight, Bell, Settings, HelpCircle, Info, FileText, Camera, Clock, CheckCircle2, Shield, Trash2, Eye, EyeOff } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth, usePets } from '../../context/AppContext';
import ProfilePhotoCropModal from '../../components/ProfilePhotoCropModal';
import { authApi, type ApiApplication } from '../../services/api';
import type { DashboardOutletContext } from './dashboardOutlet';

type ProfileTab = 'info' | 'history' | 'settings';
type SettingsSectionKey = 'main' | 'notifications' | 'privacy' | 'account' | 'help' | 'about' | 'legal';

// ─── Edit Profile ──────────────────────────────────────────────────────────────
function EditProfile() {
  const { user, updateUser, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setForm({
        fullName: user?.fullName ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        address: user?.address ?? '',
      });
    }
  }, [editing, user?.address, user?.email, user?.fullName, user?.phone]);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaveError(null);
    const updated = await updateUser(form);
    if (!updated) {
      setSaveError('Could not update your profile right now.');
      return;
    }

    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const handlePickPhoto = () => {
    if (!isUploadingPhoto) {
      fileInputRef.current?.click();
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoFeedback({ type: 'error', message: 'Please choose an image file.' });
      return;
    }

    const maxFileSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setPhotoFeedback({ type: 'error', message: 'Profile photo must be 10 MB or smaller.' });
      return;
    }

    setPhotoFeedback(null);
    setPendingCropFile(file);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    const formData = new FormData();
    formData.append('profile_photo', croppedFile);

    setIsUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const response = await authApi.uploadProfilePhoto(formData);
      const nextAvatarUrl = response.photoUrl ?? response.photo_url ?? null;
      if (nextAvatarUrl) {
        setAvatarUrl(nextAvatarUrl);
      }
      await refreshUser();
      setPhotoFeedback({
        type: 'success',
        message: response.message || 'Profile photo updated successfully!',
      });
      setPendingCropFile(null);
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload profile photo.';
      setPhotoFeedback({
        type: 'error',
        message,
      });
      return message;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const displayName = form.fullName || user?.fullName || 'AnimalBase User';
  const profileInitial =
    displayName.trim().charAt(0).toUpperCase() ||
    user?.email?.trim().charAt(0).toUpperCase() ||
    'U';

  return (
    <div className="space-y-6">
      {pendingCropFile && (
        <ProfilePhotoCropModal
          file={pendingCropFile}
          isSubmitting={isUploadingPhoto}
          onCancel={() => {
            if (!isUploadingPhoto) {
              setPendingCropFile(null);
            }
          }}
          onConfirm={handleCropConfirm}
        />
      )}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm animate-slide-up">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Profile updated successfully!
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="h-4 w-4 flex-shrink-0" /> {saveError}
        </div>
      )}
      {photoFeedback && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          photoFeedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-600'
        }`}>
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {photoFeedback.message}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => { void handlePhotoChange(event); }}
          />
          <button
            type="button"
            onClick={handlePickPhoto}
            className="block h-20 w-20 overflow-hidden rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-700">
                <span className="text-3xl font-display font-bold text-white">{profileInitial}</span>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={isUploadingPhoto}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 shadow-md transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Upload profile picture"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <h3 className="font-display font-bold text-gray-800 text-lg">{user?.fullName}</h3>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <p className="text-primary-500 text-xs mt-1">Member since {user?.joinedAt ?? '2026'}</p>
          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={isUploadingPhoto}
            className="mt-2 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploadingPhoto ? 'Uploading photo...' : 'Change picture'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-primary-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-800">Personal Information</h4>
          {!editing
            ? <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-primary-600 text-sm font-semibold hover:text-primary-800 transition-colors"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
            : <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-gray-400 text-sm font-semibold hover:text-gray-600 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-all active:scale-95"><Save className="w-3.5 h-3.5" /> Save</button>
              </div>
          }
        </div>
        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'fullName', type: 'text', placeholder: 'Your full name' },
            { label: 'Email Address', key: 'email', type: 'email', placeholder: 'your@email.com' },
            { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+63 9…' },
            { label: 'Home Address', key: 'address', type: 'text', placeholder: 'Your address' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
              {editing
                ? <input type={type} className="input-field" placeholder={placeholder} value={form[key as keyof typeof form]} onChange={set(key as keyof typeof form)} />
                : <p className="text-gray-800 font-medium text-sm py-2.5 px-4 bg-gray-50 rounded-xl">{form[key as keyof typeof form] || <span className="text-gray-300">Not set</span>}</p>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Adoption History ──────────────────────────────────────────────────────────
function AdoptionHistory({ applications }: { applications: ApiApplication[] }) {
  if (applications.length === 0) return (
    <div className="text-center py-20">
      <p className="text-4xl mb-3"></p>
      <p className="font-bold text-gray-600 mb-1">No adoption history yet</p>
      <p className="text-gray-400 text-sm">Start browsing pets to begin your adoption journey.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {applications.map(app => (
        <div key={app.id} className="bg-white rounded-2xl border border-primary-50 p-4 flex items-center gap-4 shadow-sm">
          <img src={app.petImageUrl} alt={app.petName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 text-sm">{app.petName}</h4>
            <p className="text-xs text-gray-400">{app.petType}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <Clock className="w-3 h-3" /> {app.submittedAt}
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
            app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700'
            : app.status === 'Rejected' ? 'bg-red-100 text-red-600'
            : 'bg-amber-100 text-amber-700'
          }`}>
            {app.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsMenu({ onNavigate }: { onNavigate: (section: SettingsSectionKey) => void }) {
  const items = [
    { icon: Bell,        label: 'Notifications',    desc: 'Manage alerts & reminders',     section: 'notifications' as SettingsSectionKey },
    { icon: Shield,      label: 'Privacy',          desc: 'Control your data & visibility', section: 'privacy' as SettingsSectionKey },
    { icon: Settings,    label: 'Account',          desc: 'Password, email, danger zone',  section: 'account' as SettingsSectionKey },
    { icon: HelpCircle,  label: 'Help & Support',   desc: 'FAQs, contact us',             section: 'help' as SettingsSectionKey },
    { icon: Info,        label: 'About App',        desc: 'Version & credits',            section: 'about' as SettingsSectionKey },
    { icon: FileText,    label: 'Legal & Policies', desc: 'Terms, privacy policy',        section: 'legal' as SettingsSectionKey },
  ];
  return (
    <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden shadow-sm">
      {items.map(({ icon: Icon, label, desc, section }, i) => (
        <button key={label} onClick={() => onNavigate(section)} className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-primary-50 transition-colors text-left ${i > 0 ? 'border-t border-primary-50' : ''}`}>
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-4.5 h-4.5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ─── Notification Settings ─────────────────────────────────────────────────────
function NotificationSettings({ onBack }: { onBack: () => void }) {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState({
    applicationUpdates: true,
    newPets: user?.newPetEmailNotificationsEnabled ?? true,
    petFinderAlerts: user?.petFinderEmailNotificationsEnabled ?? true,
    weeklyDigest: true,
    promotions: false,
  });
  const [savingPreferenceKey, setSavingPreferenceKey] = useState<'newPets' | 'petFinderAlerts' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setSettings(s => ({
      ...s,
      newPets: user?.newPetEmailNotificationsEnabled ?? true,
      petFinderAlerts: user?.petFinderEmailNotificationsEnabled ?? true,
    }));
  }, [user?.newPetEmailNotificationsEnabled, user?.petFinderEmailNotificationsEnabled]);

  const toggle = async (k: keyof typeof settings) => {
    const nextValue = !settings[k];
    setSettings(s => ({ ...s, [k]: nextValue }));

    if (k !== 'newPets' && k !== 'petFinderAlerts') return;

    setSavingPreferenceKey(k);
    setFeedback(null);

    const updated = await updateUser(
      k === 'newPets'
        ? { newPetEmailNotificationsEnabled: nextValue }
        : { petFinderEmailNotificationsEnabled: nextValue }
    );

    setSavingPreferenceKey(null);

    if (!updated) {
      setSettings(s => ({ ...s, [k]: !nextValue }));
      setFeedback({
        type: 'error',
        message: k === 'newPets'
          ? 'Could not update your new-pet email alert preference.'
          : 'Could not update your Pet Finder email alert preference.',
      });
      return;
    }

    setFeedback({
      type: 'success',
      message: k === 'newPets'
        ? (
          nextValue
            ? 'Email alerts for newly available pets are turned on.'
            : 'Email alerts for newly available pets are turned off.'
        )
        : (
          nextValue
            ? 'Email alerts for new Pet Finder reports are turned on.'
            : 'Email alerts for new Pet Finder reports are turned off.'
        ),
    });
  };
  const Toggle = ({ k }: { k: keyof typeof settings }) => (
    <button
      onClick={() => { void toggle(k); }}
      disabled={(k === 'newPets' || k === 'petFinderAlerts') && savingPreferenceKey === k}
      className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${settings[k] ? 'bg-primary-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[k] ? 'translate-x-6' : ''}`} />
    </button>
  );
  const rows: Array<[string, string, keyof typeof settings]> = [
    ['Application Updates', 'Status changes on your adoption applications', 'applicationUpdates'],
    ['New Pets Available', 'Send an email when a new pet becomes available for adoption', 'newPets'],
    ['Pet Finder Alerts', 'Notifications about missing pets in your area', 'petFinderAlerts'],
    ['Weekly Digest', 'A summary of available pets every week', 'weeklyDigest'],
    ['Promotions & News', 'AnimalBase updates and community news', 'promotions'],
  ];
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">
        ← Back to Settings
      </button>
      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {feedback.message}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden shadow-sm">
        {rows.map(([label, desc, key], i) => (
          <div key={key} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-primary-50' : ''}`}>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
              {(key === 'newPets' || key === 'petFinderAlerts') && savingPreferenceKey === key && (
                <p className="text-xs text-primary-500 mt-1">Saving your email preference...</p>
              )}
            </div>
            <Toggle k={key} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Privacy Settings ──────────────────────────────────────────────────────────
function PrivacySettings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState({ profileVisible: true, activityVisible: false, dataSharing: false });
  const toggle = (k: keyof typeof settings) => setSettings(s => ({ ...s, [k]: !s[k] }));
  const Toggle = ({ k }: { k: keyof typeof settings }) => (
    <button onClick={() => toggle(k)} className={`relative w-12 h-6 rounded-full transition-colors ${settings[k] ? 'bg-primary-600' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[k] ? 'translate-x-6' : ''}`} />
    </button>
  );
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">← Back</button>
      <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden shadow-sm">
        {[['Profile Visibility', 'Allow others to see your profile', 'profileVisible' as keyof typeof settings],
          ['Activity Visible', 'Show your adoption activity publicly', 'activityVisible' as keyof typeof settings],
          ['Data Sharing', 'Share anonymised usage data to improve the app', 'dataSharing' as keyof typeof settings]].map(([l, d, k], i) => (
          <div key={k} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-primary-50' : ''}`}>
            <div><p className="font-semibold text-gray-800 text-sm">{l}</p><p className="text-xs text-gray-400">{d}</p></div>
            <Toggle k={k as keyof typeof settings} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Account Settings ──────────────────────────────────────────────────────────
function AccountSettings({ onBack }: { onBack: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">← Back</button>
      <div className="bg-white rounded-2xl border border-primary-100 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-gray-800">Change Password</h4>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} className="input-field pr-11" placeholder="Min. 6 characters" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button className="btn-primary w-full py-2.5">Update Password</button>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
        <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Danger Zone</h4>
        <p className="text-sm text-red-600 mb-4">Deleting your account is irreversible. All your data and applications will be permanently removed.</p>
        <button className="border border-red-400 text-red-600 font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-red-100 transition-colors w-full">
          Delete Account
        </button>
      </div>
    </div>
  );
}

// ─── Help & Support ────────────────────────────────────────────────────────────
function DeleteReadyAccountSettings({ onBack }: { onBack: () => void }) {
  const { logout } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDeletePrompt = () => {
    if (!isDeleting) {
      setDeleteStep(0);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('Password confirmation is required before deleting your account.');
  };

  return (
    <>
      {deleteStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl shadow-red-950/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-500">Danger Zone</p>
                <h4 className="mt-2 font-display text-2xl font-bold text-gray-900">
                  {deleteStep === 1 ? 'Delete your account?' : 'Delete it permanently?'}
                </h4>
              </div>
              <button
                type="button"
                onClick={closeDeletePrompt}
                disabled={isDeleting}
                className="rounded-full bg-gray-100 p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close delete account dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-700">
              <p className="font-semibold">
                This removes your profile, your missing pet reports, and the sighting reports you submitted.
              </p>
              <p className="mt-2 text-red-600">
                Your application history will be removed from your account, but admins will still keep the adoption
                records and the email you submitted with those applications for shelter follow-up.
              </p>
            </div>

            {deleteError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <X className="h-4 w-4 flex-shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeletePrompt}
                disabled={isDeleting}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              {deleteStep === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteStep(2);
                  }}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { void handleDeleteAccount(); }}
                  disabled={isDeleting}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeleting ? 'Deleting account...' : 'Yes, delete my account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">â† Back</button>
        <div className="bg-white rounded-2xl border border-primary-100 p-5 shadow-sm space-y-4">
          <h4 className="font-bold text-gray-800">Change Password</h4>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} className="input-field pr-11" placeholder="Min. 6 characters" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button className="btn-primary w-full py-2.5">Update Password</button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Danger Zone</h4>
          <p className="text-sm text-red-600 mb-4">
            Deleting your account is irreversible. Your profile, missing reports, and sightings will be removed, while
            admins will still keep your submitted adoption records for shelter history.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteStep(1);
            }}
            className="border border-red-400 text-red-600 font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-red-100 transition-colors w-full"
          >
            Delete Account
          </button>
        </div>
      </div>
    </>
  );
}

function CleanDeleteReadyAccountSettings({ onBack }: { onBack: () => void }) {
  const { logout } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDeletePrompt = () => {
    if (!isDeleting) {
      setDeleteStep(0);
      setDeletePassword('');
      setShowDeletePassword(false);
      setDeleteError(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Enter your password to confirm account deletion.');
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await authApi.deleteMe(deletePassword);
      logout();
      window.location.assign('/');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete your account right now.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      {deleteStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl shadow-red-950/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-500">Danger Zone</p>
                <h4 className="mt-2 font-display text-2xl font-bold text-gray-900">
                  {deleteStep === 1 ? 'Delete your account?' : 'Delete it permanently?'}
                </h4>
              </div>
              <button
                type="button"
                onClick={closeDeletePrompt}
                disabled={isDeleting}
                className="rounded-full bg-gray-100 p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close delete account dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-700">
              <p className="font-semibold">
                This removes your profile, your missing pet reports, and the sighting reports you submitted.
              </p>
              <p className="mt-2 text-red-600">
                Your application history will be removed from your account, but admins will still keep the adoption
                records and the email you submitted with those applications for shelter follow-up.
              </p>
            </div>

            {deleteStep === 2 && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    className="input-field pr-11"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={event => setDeletePassword(event.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(current => !current)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter your current password one last time before your account is deleted.
                </p>
              </div>
            )}

            {deleteError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <X className="h-4 w-4 flex-shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeletePrompt}
                disabled={isDeleting}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              {deleteStep === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeletePassword('');
                    setShowDeletePassword(false);
                    setDeleteStep(2);
                  }}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { void handleDeleteAccount(); }}
                  disabled={isDeleting}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeleting ? 'Deleting account...' : 'Yes, delete my account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors"
        >
          Back
        </button>
        <div className="bg-white rounded-2xl border border-primary-100 p-5 shadow-sm space-y-4">
          <h4 className="font-bold text-gray-800">Change Password</h4>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="********" />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} className="input-field pr-11" placeholder="Min. 6 characters" />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button className="btn-primary w-full py-2.5">Update Password</button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Danger Zone</h4>
          <p className="text-sm text-red-600 mb-4">
            Deleting your account is irreversible. Your profile, missing reports, and sightings will be removed, while
            admins will still keep your submitted adoption records for shelter history.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteStep(1);
            }}
            className="border border-red-400 text-red-600 font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-red-100 transition-colors w-full"
          >
            Delete Account
          </button>
        </div>
      </div>
    </>
  );
}

function HelpSupport({ onBack }: { onBack: () => void }) {
  const faqs = [
    ['How do I adopt a pet?', 'Browse available pets, click "Adopt me", fill out the application form, and accept the verification terms. The shelter will review your application within 3–5 business days.'],
    ['Can I cancel an application?', 'Contact the shelter directly using the contact information provided on the pet\'s detail page.'],
    ['How does Pet Finder work?', 'Use Pet Finder to report a missing pet or report a sighting. Community members help reunite lost pets with their owners.'],
    ['Is AnimalBase free to use?', 'Yes! AnimalBase is completely free for adopters. Our mission is to help animals find loving homes.'],
  ];
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">← Back</button>
      <div className="bg-primary-600 rounded-2xl p-5 text-white">
        <h4 className="font-display font-bold text-lg mb-1">Need help?</h4>
        <p className="text-primary-200 text-sm mb-4">Our support team is here for you.</p>
        <div className="space-y-2">
          <a href="mailto:support@animalbase.com" className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors">📧 support@animalbase.com</a>
          <a href="tel:+63912345" className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors">📞 +63 9 1234 5678</a>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="font-bold text-gray-700 text-sm">Frequently Asked Questions</h4>
        {faqs.map(([q, a]) => (
          <div key={q} className="bg-white rounded-2xl border border-primary-100 p-4 shadow-sm">
            <p className="font-semibold text-gray-800 text-sm mb-2">{q}</p>
            <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── About ─────────────────────────────────────────────────────────────────────
function AboutApp({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">← Back</button>
      <div className="bg-white rounded-2xl border border-primary-100 p-6 shadow-sm text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
          <span className="text-3xl">🐾</span>
        </div>
        <h3 className="font-display font-bold text-xl text-gray-900 mb-1">AnimalBase</h3>
        <p className="text-primary-500 text-sm mb-4">Version 1.0.0</p>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
          AnimalBase is a platform dedicated to helping animals find loving homes. We connect shelters, pets, and families across the country.
        </p>
        <div className="mt-5 pt-5 border-t border-primary-100 grid grid-cols-3 gap-4 text-center">
          {[['2,400+', 'Pets Adopted'], ['180+', 'Shelters'], ['12k+', 'Members']].map(([n, l]) => (
            <div key={l}><p className="font-display font-bold text-primary-700 text-lg">{n}</p><p className="text-xs text-gray-400">{l}</p></div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-primary-100 p-5 shadow-sm">
        <p className="text-xs text-gray-400 text-center">Made with ❤️ for animals everywhere · © 2026 AnimalBase</p>
      </div>
    </div>
  );
}

// ─── Legal ────────────────────────────────────────────────────────────────────
function LegalPolicies({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">← Back</button>
      {[
        ['Terms of Service', 'By using AnimalBase, you agree to our terms. You must be 18 or older to adopt a pet. All adoption applications are reviewed by the respective shelters. AnimalBase acts as a connecting platform and is not directly responsible for the adoption outcome.'],
        ['Privacy Policy', 'We collect personal information for the purpose of facilitating pet adoptions. Your information is stored securely and is shared only with relevant shelters during the adoption process. We do not sell your personal data to third parties.'],
        ['Cookie Policy', 'AnimalBase uses cookies to improve your experience on the platform. These include essential cookies for login sessions and analytics cookies (with your consent) to improve our services.'],
      ].map(([title, content]) => (
        <div key={title} className="bg-white rounded-2xl border border-primary-100 p-5 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" /> {title}
          </h4>
          <p className="text-gray-500 text-sm leading-relaxed">{content}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [settingsSection, setSettingsSection] = useState<SettingsSectionKey>('main');
  const { applications } = usePets();
  const { setHidePetFinderInbox } = useOutletContext<DashboardOutletContext>();

  const tabs: Array<{ key: ProfileTab; label: string; icon: typeof User }> = [
    { key: 'info', label: 'Profile', icon: User },
    { key: 'history', label: 'History', icon: Clock },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderSettings = () => {
    switch (settingsSection) {
      case 'notifications': return <NotificationSettings onBack={() => setSettingsSection('main')} />;
      case 'privacy':       return <PrivacySettings onBack={() => setSettingsSection('main')} />;
      case 'account':       return <CleanDeleteReadyAccountSettings onBack={() => setSettingsSection('main')} />;
      case 'help':          return <HelpSupport onBack={() => setSettingsSection('main')} />;
      case 'about':         return <AboutApp onBack={() => setSettingsSection('main')} />;
      case 'legal':         return <LegalPolicies onBack={() => setSettingsSection('main')} />;
      default:              return <SettingsMenu onNavigate={s => setSettingsSection(s)} />;
    }
  };

  useEffect(() => {
    setHidePetFinderInbox(activeTab === 'settings');

    return () => {
      setHidePetFinderInbox(false);
    };
  }, [activeTab, setHidePetFinderInbox]);

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-primary-100/50 p-1 rounded-xl">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setSettingsSection('main'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'info'     && <EditProfile />}
      {activeTab === 'history'  && <AdoptionHistory applications={applications} />}
      {activeTab === 'settings' && renderSettings()}
    </div>
  );
}
