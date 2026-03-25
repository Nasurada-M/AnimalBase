import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PawPrint, Home, Search, FileText, User, LogOut, Menu, X, ChevronRight, Shield } from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import NotificationBell from '../../components/NotificationBell';
import PetFinderInbox from '../../components/PetFinderInbox';
import UserAvatar from '../../components/UserAvatar';
import type { DashboardOutletContext } from './dashboardOutlet';

const NAV_ITEMS = [
  { path: '/dashboard/home',         icon: Home,     label: 'Home' },
  { path: '/dashboard/pet-adoption', icon: PawPrint, label: 'Pet Adoption' },
  { path: '/dashboard/pet-finder',   icon: Search,   label: 'Pet Finder' },
  { path: '/dashboard/applications', icon: FileText, label: 'Applications' },
  { path: '/dashboard/profile',      icon: User,     label: 'Profile' },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hidePetFinderInbox, setHidePetFinderInbox] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPage = NAV_ITEMS.find(n => location.pathname.startsWith(n.path));
  const isAdminViewingUserSide = user?.role === 'admin';
  const outletContext: DashboardOutletContext = { setHidePetFinderInbox };

  useEffect(() => {
    if (location.pathname !== '/dashboard/profile') {
      setHidePetFinderInbox(false);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-primary-50 flex font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 h-screen w-64 bg-white border-r border-primary-100 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen`}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-primary-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md shadow-primary-200">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-primary-800">AnimalBase</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-primary-50">
          <div className="flex items-center gap-3 bg-primary-50 rounded-xl p-3">
            <UserAvatar
              fullName={user?.fullName}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              className="h-10 w-10 rounded-full flex-shrink-0"
              textClassName="text-sm"
            />
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{user?.fullName ?? 'User'}</p>
              <p className="text-gray-400 text-xs truncate">{user?.email ?? ''}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">Menu</p>
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => { navigate(path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all group ${
                  active
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'}`} />
                {label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto px-3 py-4 border-t border-primary-100">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-primary-100 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-primary-600 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display font-bold text-gray-800 text-lg leading-tight">{currentPage?.label ?? 'Dashboard'}</h1>
              <p className="text-gray-400 text-xs hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdminViewingUserSide && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 text-xs font-semibold text-primary-700 bg-primary-100 hover:bg-primary-200 px-3 py-2 rounded-xl transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin View</span>
              </button>
            )}
            <NotificationBell scope="user" variant="dashboard" />
            <UserAvatar
              fullName={user?.fullName}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              className="h-9 w-9 rounded-xl shadow-sm"
              textClassName="text-sm"
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={outletContext} />
        </main>
      </div>

      <PetFinderInbox hidden={hidePetFinderInbox} />

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-gray-900 text-center mb-2">Log Out</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleLogout} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-all active:scale-95">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
