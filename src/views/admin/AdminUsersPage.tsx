import { useEffect, useState } from 'react';
import { Edit3, Trash2, Key, X, Save, Loader2, UserCheck, UserX } from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { adminApi, ApiUser } from '../../services/api';
import UserAvatar from '../../components/UserAvatar';
import ClearableSearchField from '../../components/ClearableSearchField';

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<ApiUser[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [newPw, setNewPw]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const editableFields: Array<{ label: string; key: 'fullName' | 'email' | 'phone' | 'address' }> = [
    { label: 'Full Name', key: 'fullName' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Address', key: 'address' },
  ];

  const load = async (q?: string) => {
    setLoading(true);
    try { setUsers(await adminApi.getUsers(q)); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateUser(editUser.id, editUser);
      setUsers(u => u.map(x => x.id === updated.id ? updated : x));
      setEditUser(null);
      setMsg('User updated.');
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await adminApi.deleteUser(deleteUser.id);
      setUsers(u => u.filter(x => x.id !== deleteUser.id));
      setDeleteUser(null);
      setMsg('User deleted.');
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleResetPw = async () => {
    if (!resetUser || !newPw) return;
    setSaving(true);
    try {
      await adminApi.resetPassword(resetUser.id, newPw);
      setResetUser(null); setNewPw('');
      setMsg('Password reset successfully.');
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleRemoveAvatar = () => {
    if (!editUser) return;
    setEditUser({ ...editUser, avatarUrl: null });
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
          <h2 className="font-display font-bold text-xl text-gray-800">Users</h2>
          <p className="text-gray-400 text-sm">{users.length} registered users</p>
        </div>
        <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
          <ClearableSearchField
            value={search}
            onChange={setSearch}
            onClear={() => load()}
            placeholder="Search users..."
            containerClassName="flex-1 sm:flex-none"
            inputClassName="w-56"
            iconClassName="text-gray-400"
            clearLabel="Clear users search"
          />
          <button type="submit" className="btn-primary px-4">Search</button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          fullName={u.fullName}
                          email={u.email}
                          avatarUrl={u.avatarUrl}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                          textClassName="text-sm"
                          alt={`${u.fullName} profile`}
                        />
                        <span className="font-medium text-gray-800">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{u.email}</td>
                    <td className="px-5 py-4 text-gray-500">{u.phone || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditUser({ ...u })} className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setResetUser(u); setNewPw(''); }} className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors" title="Reset Password">
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteUser(u)} className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center py-10 text-gray-400">No users found.</p>}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-bounce-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-display font-bold text-gray-800">Edit User</h3>
                <button onClick={() => setEditUser(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Profile Photo</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        fullName={editUser.fullName}
                        email={editUser.email}
                        avatarUrl={editUser.avatarUrl}
                        className="w-14 h-14 rounded-full flex-shrink-0"
                        textClassName="text-lg"
                        alt={`${editUser.fullName} profile`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {editUser.avatarUrl ? 'Custom profile photo' : 'Default profile avatar'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {editUser.avatarUrl
                            ? 'Remove the uploaded photo if it is offensive or violates admin standards.'
                            : 'This user is currently using the default initials avatar.'}
                        </p>
                      </div>
                    </div>
                    {editUser.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
                {editableFields.map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                    <input
                      className="input-field"
                      value={editUser[key] || ''}
                      onChange={e => setEditUser({ ...editUser, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Role</label>
                  <select className="input-field" value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value as 'user' | 'admin' })}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-bounce-in p-6">
              <h3 className="font-display font-bold text-gray-800 mb-1">Reset Password</h3>
              <p className="text-gray-400 text-sm mb-5">For <strong>{resetUser.fullName}</strong></p>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
              <input type="password" className="input-field mb-5" placeholder="Min. 6 characters" value={newPw} onChange={e => setNewPw(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setResetUser(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleResetPw} disabled={saving || newPw.length < 6} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Resetting…' : 'Reset'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Modal */}
      {deleteUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-bounce-in p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <UserX className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-display font-bold text-gray-800 mb-2">Delete User?</h3>
              <p className="text-gray-500 text-sm mb-6">This will permanently delete <strong>{deleteUser.fullName}</strong> and all their data.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteUser(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} disabled={saving} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-all">
                  {saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
