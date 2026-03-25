import { useEffect, useState } from 'react';
import { Trash2, X, Loader2, MapPin, Calendar, Phone, Mail, Eye, PawPrint, ArrowUpRight } from 'lucide-react';
import { adminApi, ApiAdminSighting } from '../../services/api';
import ClearableSearchField from '../../components/ClearableSearchField';

function buildGoogleMapsUrl(latitude?: number, longitude?: number, query?: string) {
  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedQuery)}`;
  }

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return null;
}

export default function AdminSightingsPage() {
  const [sightings, setSightings] = useState<ApiAdminSighting[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [detail, setDetail]       = useState<ApiAdminSighting | null>(null);
  const [deleting, setDeleting]   = useState<ApiAdminSighting | null>(null);
  const [msg, setMsg]             = useState('');

  const load = async () => {
    setLoading(true);
    try { setSightings(await adminApi.getSightings()); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = sightings.filter(s => {
    const q = search.toLowerCase();
    return !q
      || s.petName.toLowerCase().includes(q)
      || s.reporterName.toLowerCase().includes(q)
      || s.locationSeen.toLowerCase().includes(q);
  });
  const detailLocationLabel = detail?.address || detail?.locationSeen || '';
  const detailMapUrl = detail
    ? buildGoogleMapsUrl(detail.latitude, detail.longitude, detailLocationLabel)
    : null;

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await adminApi.deleteSighting(deleting.id);
      setSightings(s => s.filter(x => x.id !== deleting.id));
      setDeleting(null);
      if (detail?.id === deleting.id) setDetail(null);
      setMsg('Sighting deleted.');
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error.');
    }
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {msg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
          {msg} <button onClick={() => setMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-gray-800">Sighting Reports</h2>
          <p className="text-gray-400 text-sm">{sightings.length} total sightings submitted</p>
        </div>
        <ClearableSearchField
          value={search}
          onChange={setSearch}
          placeholder="Search sightings..."
          inputClassName="w-56"
          iconClassName="text-gray-400"
          clearLabel="Clear sightings search"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Eye className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No sightings found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Pet Spotted', 'Reported By', 'Location Seen', 'Date Seen', 'Reported At', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setDetail(s)}>
                    {/* Pet */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {s.petImageUrl
                          ? <img src={s.petImageUrl} alt={s.petName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                          : <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"><PawPrint className="w-4 h-4 text-primary-300" /></div>
                        }
                        <div>
                          <p className="font-semibold text-gray-800">{s.petName}</p>
                          <p className="text-xs text-gray-400">{s.petBreed} · {s.petType}</p>
                        </div>
                      </div>
                    </td>
                    {/* Reporter */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">{s.reporterName}</p>
                      <p className="text-xs text-gray-400">{s.reporterEmail}</p>
                    </td>
                    {/* Location */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-1.5 text-gray-600 max-w-[180px]">
                        <MapPin className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs leading-relaxed">{s.locationSeen}</span>
                      </div>
                    </td>
                    {/* Date seen */}
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {s.dateSeen ? new Date(s.dateSeen).toLocaleDateString() : '—'}
                    </td>
                    {/* Reported at */}
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(s.reportedAt).toLocaleString()}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleting(s)}
                        className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center modal-backdrop p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-bounce-in my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-display font-bold text-gray-800">Sighting Detail</h3>
              <button onClick={() => setDetail(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">

              {/* Pet info */}
              <div className="flex items-center gap-4 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                {detail.petImageUrl
                  ? <img src={detail.petImageUrl} alt={detail.petName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><PawPrint className="w-7 h-7 text-amber-400" /></div>
                }
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-0.5">Pet Spotted</p>
                  <h4 className="font-display font-bold text-gray-800">{detail.petName}</h4>
                  <p className="text-xs text-gray-500">{detail.petBreed} · {detail.petType}</p>
                  <span className={`mt-1.5 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                    detail.petStatus === 'Missing' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                  }`}>{detail.petStatus}</span>
                </div>
              </div>

              {/* Reporter info */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Reported By</p>
                <p className="font-semibold text-gray-800 mb-1">{detail.reporterName}</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-primary-400" /> {detail.reporterEmail}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-primary-400" /> {detail.reporterPhone}
                  </div>
                </div>
              </div>

              {/* Location & date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Location Seen</p>
                  {detailMapUrl ? (
                    <a
                      href={detailMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-xl bg-primary-50 p-3 transition-colors hover:bg-primary-100"
                    >
                      <div className="flex items-start gap-1.5 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="break-words">{detailLocationLabel}</p>
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
                            Open in Google Maps
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </p>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-start gap-1.5 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      {detail.locationSeen}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Date Seen</p>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    {detail.dateSeen ? new Date(detail.dateSeen).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{detail.description}</p>
              </div>

              <p className="text-xs text-gray-400">
                Submitted {new Date(detail.reportedAt).toLocaleString()}
              </p>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setDetail(null)} className="btn-secondary flex-1">Close</button>
                <button
                  onClick={() => { setDeleting(detail); setDetail(null); }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Delete Sighting?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently remove the sighting report by <strong>{deleting.reporterName}</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
