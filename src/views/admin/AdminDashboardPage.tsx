import { useEffect, useState } from 'react';
import { Users, PawPrint, FileText, Search, TrendingUp, Clock, CheckCircle2, XCircle, Eye, MapPin } from 'lucide-react';
import { adminApi, AdminStats } from '../../services/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Users',      value: stats?.totalUsers ?? 0,      icon: Users,    color: 'bg-blue-50 text-blue-600 border-blue-200'        },
    { label: 'Available Pets',   value: stats?.availablePets ?? 0,   icon: PawPrint, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Pending Apps',     value: stats?.pendingApps ?? 0,     icon: FileText, color: 'bg-amber-50 text-amber-600 border-amber-200'       },
    { label: 'Missing Pets',     value: stats?.missingPets ?? 0,     icon: Search,   color: 'bg-red-50 text-red-600 border-red-200'             },
    { label: 'Total Sightings',  value: stats?.totalSightings ?? 0,  icon: Eye,      color: 'bg-purple-50 text-purple-600 border-purple-200'    },
  ];

  const statusIcon = (s: string) => {
    if (s === 'Approved') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === 'Rejected') return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl text-gray-900 mb-1">Welcome back, Admin 👋</h2>
        <p className="text-gray-500 text-sm">Here's what's happening with AnimalBase today.</p>
      </div>

      {/* Stats — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-2xl border p-5 shadow-sm ${color.split(' ')[2]}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color.split(' ').slice(0,2).join(' ')}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-display font-bold text-2xl text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Two-column activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h3 className="font-display font-bold text-gray-800">Recent Applications</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentApplications ?? []).length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">No applications yet.</p>
            ) : stats?.recentApplications.map(app => (
              <div key={app.id} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PawPrint className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{app.full_name}</p>
                  <p className="text-xs text-gray-400">
                    Applied for <span className="text-primary-600">{app.pet_name}</span> · {app.pet_type}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {statusIcon(app.status)}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700'
                    : app.status === 'Rejected' ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                  }`}>{app.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sightings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Eye className="w-5 h-5 text-primary-500" />
            <h3 className="font-display font-bold text-gray-800">Recent Sightings</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentSightings ?? []).length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">No sightings reported yet.</p>
            ) : stats?.recentSightings.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {s.reporter_name} spotted <span className="text-primary-600">{s.pet_name}</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {s.location_seen}
                  </p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(s.reported_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}