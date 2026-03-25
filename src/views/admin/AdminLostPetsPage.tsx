import { useEffect, useState } from 'react';
import { Trash2, CheckCircle2, X, Loader2, MapPin, Calendar, Eye } from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { adminApi, ApiAdminLostPet } from '../../services/api';

export default function AdminLostPetsPage() {
  const [pets, setPets]           = useState<ApiAdminLostPet[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<number | null>(null);
  const [confirmFound, setConfirmFound] = useState<ApiAdminLostPet | null>(null);
  const [deletePet, setDeletePet] = useState<ApiAdminLostPet | null>(null);
  const [msg, setMsg]             = useState('');

  const load = async () => {
    setLoading(true);
    try { setPets(await adminApi.getLostPets()); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markFound = async (id: number) => {
    setUpdating(id);
    try {
      await adminApi.updateLostPetStatus(id, 'Found');
      setPets(p => p.map(x => x.id === id ? { ...x, status: 'Found' } : x));
      setMsg('Marked as found!');
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Error.'); }
    finally { setUpdating(null); }
  };

  const handleDelete = async () => {
    if (!deletePet) return;
    try {
      await adminApi.deleteLostPet(deletePet.id);
      setPets(p => p.filter(x => x.id !== deletePet.id));
      setDeletePet(null);
      setMsg('Report deleted.');
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Error.'); }
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {msg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
          {msg} <button onClick={() => setMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-display font-bold text-xl text-gray-800">Lost Pet Reports</h2>
        <p className="text-gray-400 text-sm">{pets.filter(p => p.status === 'Missing').length} currently missing · {pets.reduce((a, p) => a + p.sightingCount, 0)} sightings total</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Pet', 'Type / Breed', 'Last Seen', 'Owner', 'Sightings', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pets.map(pet => (
                  <tr key={pet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {pet.imageUrl
                          ? <img src={pet.imageUrl} alt={pet.petName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          : <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">🐾</div>
                        }
                        <span className="font-semibold text-gray-800">{pet.petName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">{pet.type}</p>
                      <p className="text-xs text-gray-400">{pet.breed}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-1.5 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium max-w-[140px]">{pet.lastSeenLocation}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {pet.lastSeenDate ? new Date(pet.lastSeenDate).toLocaleDateString() : '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">{pet.ownerName}</p>
                      <p className="text-xs text-gray-400">{pet.ownerEmail}</p>
                    </td>
                    {/* Sighting count badge */}
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        pet.sightingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Eye className="w-3 h-3" />
                        {pet.sightingCount}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        pet.status === 'Missing' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                      }`}>{pet.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        {pet.status === 'Missing' && (
                          <button
                            onClick={() => setConfirmFound(pet)}
                            disabled={updating === pet.id}
                            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {updating === pet.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3 h-3" />
                            } Found
                          </button>
                        )}
                        <button
                          onClick={() => setDeletePet(pet)}
                          className="flex items-center gap-1 bg-red-50 text-red-500 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pets.length === 0 && <p className="text-center py-10 text-gray-400">No lost pet reports.</p>}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmFound && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Mark as Found?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This will mark <strong>{confirmFound.petName}</strong> as found and close the report.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmFound(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  disabled={updating === confirmFound.id}
                  onClick={async () => { const pet = confirmFound; setConfirmFound(null); await markFound(pet.id); }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
                >
                  {updating === confirmFound.id ? 'Saving...' : 'Yes, Mark Found'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deletePet && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Delete Report?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This will permanently delete the report for <strong>{deletePet.petName}</strong> and all its sightings.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletePet(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">Delete</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}