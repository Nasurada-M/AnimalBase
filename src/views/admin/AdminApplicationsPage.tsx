import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, X, Loader2, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import ClearableSearchField from '../../components/ClearableSearchField';
import { adminApi, ApiApplication } from '../../services/api';

const STATUSES = ['All', 'Pending', 'Approved', 'Rejected'];
type ActionStatus = 'Approved' | 'Rejected';
const ADOPTED_PET_LOCK_MESSAGE = 'This pet has already been adopted by its new owners.';

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ app: ApiApplication; status: ActionStatus } | null>(null);
  const [detail, setDetail] = useState<ApiApplication | null>(null);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [remarkPromptId, setRemarkPromptId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const load = async (nextSearch = search) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'All') params.status = filter;
      if (nextSearch) params.search = nextSearch;
      const loadedApps = await adminApi.getApplications(params);
      setApps(loadedApps);
      setRemarks(current => {
        const next = { ...current };
        loadedApps.forEach(app => {
          if (typeof next[app.id] !== 'string' || app.adminRemark) {
            next[app.id] = app.adminRemark ?? next[app.id] ?? '';
          }
        });
        return next;
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const getRemark = (appId: number) => remarks[appId] ?? '';

  const setRemark = (appId: number, value: string) => {
    if (value.trim()) {
      setRemarkPromptId(current => (current === appId ? null : current));
    }
    setRemarks(current => ({ ...current, [appId]: value }));
  };

  const updateStatus = async (app: ApiApplication, status: ActionStatus) => {
    const nextRemark = getRemark(app.id).trim();
    if (!nextRemark) {
      setRemarkPromptId(app.id);
      setMsgType('error');
      setMsg('Please fill up the remark first before approving or declining the application.');
      return;
    }

    setRemarkPromptId(current => (current === app.id ? null : current));
    setUpdating(app.id);
    try {
      const updated = await adminApi.updateAppStatus(app.id, status, nextRemark);
      setApps(a => a.map(x => (x.id === updated.id ? updated : x)));
      if (detail?.id === app.id) setDetail(updated);
      setRemarks(current => ({ ...current, [updated.id]: updated.adminRemark ?? nextRemark }));
      setMsgType('success');
      setMsg(`Application ${status.toLowerCase()} with remark saved.`);
    } catch (err: unknown) {
      setMsgType('error');
      setMsg(err instanceof Error ? err.message : 'Error.');
    } finally {
      setUpdating(null);
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'Approved') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === 'Rejected') return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusCls = (s: string) =>
    s === 'Approved' ? 'badge-approved' : s === 'Rejected' ? 'badge-rejected' : 'badge-pending';

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm flex justify-between ${
          msgType === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {msg} <button onClick={() => setMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-gray-800">Applications</h2>
          <p className="text-gray-400 text-sm">{apps.length} applications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === s ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <ClearableSearchField
              value={search}
              onChange={setSearch}
              onClear={() => load('')}
              onKeyDown={e => e.key === 'Enter' && load(search)}
              placeholder="Search..."
              inputClassName="w-44"
              iconClassName="text-gray-400"
              clearLabel="Clear applications search"
            />
            <button onClick={() => load(search)} className="btn-primary px-4 text-sm">Filter</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Applicant', 'Pet', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {apps.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setDetail(app)}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{app.fullName}</p>
                      <p className="text-xs text-gray-400">{app.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {app.petImageUrl && <img src={app.petImageUrl} alt={app.petName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-800">{app.petName}</p>
                          <p className="text-xs text-gray-400">{app.petType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`${statusCls(app.status)} flex items-center gap-1 w-fit`}>
                        {statusIcon(app.status)} {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{new Date(app.submittedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 w-px" onClick={e => e.stopPropagation()}>
                      {app.status === 'Pending' && (
                        <div className="w-72 space-y-2">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                              Remark
                            </label>
                            <textarea
                              className="input-field min-h-20 resize-none text-xs leading-relaxed"
                              placeholder="Enter the reason or next steps before making a decision..."
                              value={getRemark(app.id)}
                              onChange={e => setRemark(app.id, e.target.value)}
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmAction({ app, status: 'Approved' }); }}
                              disabled={updating === app.id}
                              className="flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              {updating === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmAction({ app, status: 'Rejected' }); }}
                              disabled={updating === app.id}
                              className="flex items-center gap-1 bg-red-50 text-red-600 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        </div>
                      )}
                      {app.status !== 'Pending' && app.adminRemark && (
                        <div className="max-w-xs rounded-xl border border-primary-100 bg-primary-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600">Remark</p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-600">{app.adminRemark}</p>
                        </div>
                      )}
                      {app.status !== 'Pending' && !app.adminRemark && (
                        <span className="text-xs text-gray-300">No remark</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apps.length === 0 && <p className="text-center py-10 text-gray-400">No applications found.</p>}
          </div>
        )}
      </div>

{detail && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="modal-panel animate-bounce-in">
            <div className="sticky top-0 bg-white border-b border-primary-100 px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
              <h3 className="font-display font-bold text-lg text-gray-900">Application Details</h3>
              <button onClick={() => setDetail(null)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 bg-primary-50 rounded-2xl p-4">
                {detail.petImageUrl ? (
                  <img src={detail.petImageUrl} alt={detail.petName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0">PET</div>
                )}
                <div>
                  <h4 className="font-display font-bold text-gray-900">{detail.petName}</h4>
                  <p className="text-gray-500 text-sm">{detail.petType}</p>
                  <span className={`${statusCls(detail.status)} mt-1.5 flex items-center gap-1 w-fit`}>
                    {statusIcon(detail.status)} {detail.status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 text-sm mb-3">Applicant Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Full Name</p>
                    <p className="font-medium text-gray-800">{detail.fullName}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                    <span className="break-all">{detail.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                    <span>{detail.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                    <span>{detail.homeAddress}</span>
                  </div>
                </div>
              </div>

              {[
                ['Previous Pet Experience', detail.previousPetExperience],
                ['Why Adopt?', detail.whyAdopt],
                ['Why Chosen?', detail.whyChooseYou],
              ].map(([label, value]) => (
                <div key={label}>
                  <h4 className="font-bold text-gray-700 text-sm mb-2">{label}</h4>
                  <p className="text-gray-500 text-sm bg-gray-50 rounded-xl p-3 leading-relaxed">{value}</p>
                </div>
              ))}

              {detail.adminRemark && (
                <div>
                  <h4 className="font-bold text-gray-700 text-sm mb-2">Admin Remark</h4>
                  <p className="text-gray-600 text-sm bg-primary-50 border border-primary-100 rounded-xl p-3 leading-relaxed">
                    {detail.adminRemark}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Submitted: {new Date(detail.submittedAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Updated: {new Date(detail.updatedAt).toLocaleDateString()}
                </div>
              </div>

              {detail.status === 'Approved' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <p className="font-semibold mb-2">{ADOPTED_PET_LOCK_MESSAGE}</p>
                  <p className="text-xs text-red-600">
                    This adoption is already final. Admins can no longer change this pet back to Available or set its applications back to Pending.
                  </p>
                </div>
              )}
              {detail.status === 'Rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  This application was not approved.
                </div>
              )}
              {detail.status === 'Pending' && (
                <>
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-2">Remark</h4>
                    <textarea
                      className="input-field min-h-28 resize-none"
                      placeholder="Enter the reason or next steps before approving or rejecting this application..."
                      value={getRemark(detail.id)}
                      onChange={e => setRemark(detail.id, e.target.value)}
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      This remark will be shown to the user in their notification.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setConfirmAction({ app: detail, status: 'Rejected' })}
                      disabled={!!updating}
                      className="flex-1 border border-red-300 text-red-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setConfirmAction({ app: detail, status: 'Approved' })}
                      disabled={!!updating}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                </>
              )}

              <button onClick={() => setDetail(null)} className="w-full btn-secondary mt-2">Close</button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {confirmAction && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center" onClick={e => e.stopPropagation()}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${confirmAction.status === 'Approved' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {confirmAction.status === 'Approved'
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  : <XCircle className="w-6 h-6 text-red-500" />}
              </div>
              <h3 className="font-bold text-gray-800 mb-2">
                {confirmAction.status === 'Approved' ? 'Approve' : 'Reject'} {confirmAction.app.fullName}'s Application?
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {confirmAction.status === 'Approved'
                  ? `This will approve their application for ${confirmAction.app.petName}. All other pending applications for this pet will be automatically rejected.`
                  : `This will reject their application for ${confirmAction.app.petName}.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  disabled={updating === confirmAction.app.id}
                  onClick={async () => { const { app, status } = confirmAction; setConfirmAction(null); await updateStatus(app, status); }}
                  className={`flex-1 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors ${confirmAction.status === 'Approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {updating === confirmAction.app.id ? 'Saving...' : confirmAction.status === 'Approved' ? 'Confirm' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
