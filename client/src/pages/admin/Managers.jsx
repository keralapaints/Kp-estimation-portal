import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { errMsg } from '../../api';
import Modal from '../../components/Modal';

const empty = { name: '', email: '', phone: '', password: '', region: '', pincodes: '', active: true };

export default function Managers() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | manager
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => api.get('/admin/managers').then((r) => setList(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const open = (m) => {
    setFormError('');
    if (m === 'new') setForm(empty);
    else setForm({ ...empty, ...m, password: '', pincodes: (m.pincodes || []).join(', ') });
    setEditing(m);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') await api.post('/admin/managers', form);
      else await api.put(`/admin/managers/${editing._id}`, form);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    const msg = m.openJobs
      ? `${m.name} has ${m.openJobs} open job(s). They will go back to the unassigned queue. Delete this manager?`
      : `Delete ${m.name}?`;
    if (!window.confirm(msg)) return;
    try { await api.delete(`/admin/managers/${m._id}`); load(); } catch (e) { setError(errMsg(e)); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <div className="page-head">
        <div><h1>Managers</h1><p className="muted">Managers log in to see and handle the site visits you assign.</p></div>
        <button className="btn btn--primary" onClick={() => open('new')}><Plus size={16} /> Add manager</button>
      </div>
      {error && <p className="alert alert--error">{error}</p>}

      <div className="panel panel--flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Region</th><th>Pincodes</th><th className="num">Open jobs</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="empty">No managers yet. Add your first manager to start assigning visits.</td></tr>}
              {list.map((m) => (
                <tr key={m._id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.email}<br /><span className="muted">{m.phone || '—'}</span></td>
                  <td>{m.region || '—'}</td>
                  <td className="pins">{m.pincodes?.length ? m.pincodes.join(', ') : <span className="muted">None</span>}</td>
                  <td className="num">{m.openJobs} <span className="muted">/ {m.totalJobs}</span></td>
                  <td><span className={`badge ${m.active ? 'badge--leaf' : 'badge--muted'}`}>{m.active ? 'Active' : 'Disabled'}</span></td>
                  <td className="num nowrap">
                    <button className="icon-btn" onClick={() => open(m)} aria-label={`Edit ${m.name}`}><Pencil size={16} /></button>
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(m)} aria-label={`Delete ${m.name}`}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add manager' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="grid grid--2">
              <label className="field"><span>Name</span><input required value={form.name} onChange={set('name')} /></label>
              <label className="field"><span>Phone</span><input value={form.phone} onChange={set('phone')} /></label>
            </div>
            <label className="field"><span>Email (used to log in)</span><input type="email" required value={form.email} onChange={set('email')} /></label>
            <label className="field">
              <span>{editing === 'new' ? 'Password' : 'New password (leave blank to keep current)'}</span>
              <input type="password" minLength={6} required={editing === 'new'} value={form.password} onChange={set('password')} autoComplete="new-password" />
            </label>
            <label className="field"><span>Region</span><input value={form.region} placeholder="e.g. Ernakulam" onChange={set('region')} /></label>
            <label className="field">
              <span>Pincodes covered</span>
              <textarea rows={2} value={form.pincodes} placeholder="682001, 682011, 682017" onChange={set('pincodes')} />
              <small>New bookings from these pincodes will suggest this manager.</small>
            </label>
            <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Account active</label>
            {formError && <p className="alert alert--error">{formError}</p>}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add manager' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
