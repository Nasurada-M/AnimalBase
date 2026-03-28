import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PawPrint, LayoutDashboard, Users, FileText, Search, LogOut, Menu, X, ChevronRight, Shield, Eye } from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import NotificationBell from '../../components/NotificationBell';
import UserAvatar from '../../components/UserAvatar';

const NAV = [
  { path: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard'    },
  { path: '/admin/users',         icon: Users,           label: 'Users'        },
  { path: '/admin/pets',          icon: PawPrint,        label: 'Pets'         },
  { path: '/admin/applications',  icon: FileText,        label: 'Applications' },
  { path: '/admin/lost-pets',     icon: Search,          label: 'Lost Pets'    },
  { path: '/admin/sightings',     icon: Eye,             label: 'Sightings'    },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const current = NAV.find(n => location.pathname.startsWith(n.path));

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 h-screen w-64 bg-primary-900 z-40 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen`}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-primary-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display font-bold text-white text-base leading-tight">AnimalBase</p>
                <p className="text-primary-400 text-xs flex items-center gap-1"><Shield className="w-3 h-3" /> Admin Panel</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden text-primary-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b border-primary-700/50">
          <div className="flex items-center gap-3 bg-primary-800 rounded-xl p-3">
            <UserAvatar
              fullName={user?.fullName}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              className="h-9 w-9 rounded-full flex-shrink-0"
              textClassName="text-sm"
            />
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">{user?.fullName}</p>
              <p className="text-primary-400 text-xs">Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-bold text-primary-500 uppercase tracking-wider px-3 mb-3">Management</p>
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button key={path} onClick={() => { navigate(path); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary-600 text-white' : 'text-primary-300 hover:bg-primary-800 hover:text-white'}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto px-3 py-4 border-t border-primary-700/50">
          <button onClick={() => setConfirmLogout(true)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-900/30 transition-all">
            <LogOut className="w-5 h-5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden text-gray-500 hover:text-primary-600">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display font-bold text-gray-800 text-lg">{current?.label ?? 'Admin'}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">AnimalBase Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell scope="admin" variant="admin" />
            <button onClick={() => navigate('/dashboard/home')} className="hidden sm:flex items-center gap-2 text-xs text-primary-600 font-semibold bg-primary-50 px-3 py-2 rounded-xl hover:bg-primary-100 transition-colors">
              User View
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Logout confirm */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in">
            <h3 className="font-display font-bold text-lg text-gray-900 text-center mb-2">Log Out</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLogout(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleLogout} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-all">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
