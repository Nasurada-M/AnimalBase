import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, ChevronRight, X, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { usePets } from '../../context/AppContext';
import { ApiApplication } from '../../services/api';

const STATUS_TABS = ['Pending', 'Approved', 'Rejected'] as const;
type AppStatus = typeof STATUS_TABS[number];

function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = {
    Pending:  { cls: 'badge-pending',  Icon: Clock,        label: 'Pending'  },
    Approved: { cls: 'badge-approved', Icon: CheckCircle2, label: 'Approved' },
    Rejected: { cls: 'badge-rejected', Icon: XCircle,      label: 'Rejected' },
  }[status];
  return (
    <span className={`${cfg.cls} flex items-center gap-1`}>
      <cfg.Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function AppDetailModal({ app, onClose }: { app: ApiApplication; onClose: () => void }) {
  return (
    <ModalPortal>
      <div className="modal-backdrop" onClick={onClose}>
      {/* stop click-through */}
      <div className="modal-panel" onClick={e => e.stopPropagation()}>

        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-primary-100 px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
          <h2 className="font-display font-bold text-lg text-gray-900">Application Details</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 space-y-5">

          {/* Pet info */}
          <div className="flex items-center gap-4 bg-primary-50 rounded-2xl p-4">
            {app.petImageUrl
              ? <img src={app.petImageUrl} alt={app.petName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              : <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-2xl flex-shrink-0">🐾</div>
            }
            <div>
              <h3 className="font-display font-bold text-gray-900">{app.petName}</h3>
              <p className="text-gray-500 text-sm">{app.petType}</p>
              <div className="mt-1.5"><StatusBadge status={app.status} /></div>
            </div>
          </div>

          {/* Applicant info */}
          <div>
            <h4 className="font-bold text-gray-700 text-sm mb-3">Applicant Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Full Name</p>
                <p className="font-medium text-gray-800">{app.fullName}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                <span className="break-all">{app.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                <span>{app.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>{app.homeAddress}</span>
              </div>
            </div>
          </div>

          {/* Essay answers */}
          {([
            ['Previous Pet Experience', app.previousPetExperience],
            ['Why Adopt?',              app.whyAdopt],
            ['Why Chosen?',             app.whyChooseYou],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}>
              <h4 className="font-bold text-gray-700 text-sm mb-2">{label}</h4>
              <p className="text-gray-500 text-sm bg-gray-50 rounded-xl p-3 leading-relaxed">{value}</p>
            </div>
          ))}

          {app.adminRemark && (
            <div>
              <h4 className="font-bold text-gray-700 text-sm mb-2">Admin Remark</h4>
              <p className="text-gray-600 text-sm bg-primary-50 border border-primary-100 rounded-xl p-3 leading-relaxed">
                {app.adminRemark}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Submitted: {new Date(app.submittedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Updated: {new Date(app.updatedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Status messages */}
          {app.status === 'Approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
               <strong>Congratulations!</strong> Your application has been approved! The shelter will contact you within 3–5 business days.
            </div>
          )}
          {app.status === 'Rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Unfortunately your application was not approved this time. Consider reaching out to the shelter for feedback.
            </div>
          )}

          {/* Close button at bottom */}
          <button onClick={onClose} className="w-full btn-secondary mt-2">Close</button>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
}

function AppCard({ app, onView }: { app: ApiApplication; onView: () => void }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-primary-50 p-4 flex items-center gap-4 card-hover cursor-pointer"
      onClick={onView}
    >
      {app.petImageUrl
        ? <img src={app.petImageUrl} alt={app.petName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        : <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">🐾</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h3 className="font-display font-bold text-gray-800">{app.petName}</h3>
          <StatusBadge status={app.status} />
        </div>
        <p className="text-xs text-gray-400 mb-1">{app.petType}</p>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          Submitted {new Date(app.submittedAt).toLocaleDateString()}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-primary-300 flex-shrink-0" />
    </div>
  );
}

export default function ApplicationsPage() {
  const { applications, fetchApplications } = usePets();
  const [activeTab, setActiveTab] = useState<AppStatus>('Pending');
  const [selectedApp, setSelectedApp] = useState<ApiApplication | null>(null);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const filtered = applications.filter(a => a.status === activeTab);
  const counts = {
    Pending:  applications.filter(a => a.status === 'Pending').length,
    Approved: applications.filter(a => a.status === 'Approved').length,
    Rejected: applications.filter(a => a.status === 'Rejected').length,
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {STATUS_TABS.map(status => {
          const cfg = {
            Pending:  { color: 'bg-amber-50 border-amber-200',    text: 'text-amber-700',   Icon: Clock        },
            Approved: { color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', Icon: CheckCircle2 },
            Rejected: { color: 'bg-red-50 border-red-200',        text: 'text-red-600',      Icon: XCircle      },
          }[status];
          return (
            <div key={status} className={`${cfg.color} border rounded-2xl p-4 text-center`}>
              <cfg.Icon className={`w-5 h-5 ${cfg.text} mx-auto mb-2`} />
              <p className={`font-display font-bold text-xl ${cfg.text}`}>{counts[status]}</p>
              <p className="text-xs text-gray-500">{status}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-primary-100/50 p-1 rounded-xl">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className={`ml-1 text-xs ${activeTab === tab ? 'text-primary-500' : 'text-gray-400'}`}>
                ({counts[tab]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">
            {activeTab === 'Pending' ? '' : activeTab === 'Approved' ? '' : ''}
          </p>
          <p className="font-bold text-gray-600 mb-1">No {activeTab.toLowerCase()} applications</p>
          <p className="text-gray-400 text-sm">
            {activeTab === 'Pending'
              ? "You haven't submitted any applications yet."
              : `No applications have been ${activeTab.toLowerCase()} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <AppCard key={app.id} app={app} onView={() => setSelectedApp(app)} />
          ))}
        </div>
      )}

      {selectedApp && (
        <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </div>
  );
}
