import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { errMsg } from '../../api';
import Modal from '../../components/Modal';
import { ROLES } from '../../constants';

const TEAM_ROLES = ['crm', 'project_manager', 'manager'];
const ROLE_HELP = {
  crm: 'Calls new leads, corrects their details and marks them genuine or wrong.',
  project_manager: 'Assigns verified leads to field inspectors.',
  manager: 'Visits the site, records measurements and sends the estimate.',
};
const empty = { name: '', email: '', phone: '', password: '', role: 'crm', region: '', pincodes: '', active: true };

export default function Team() {
  const [list, setList] = useState([]);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | user
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => api.get('/admin/users').then((r) => setList(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const open = (u) => {
    setFormError('');
    if (u === 'new') setForm({ ...empty, role: tab === 'all' ? 'crm' : tab });
    else setForm({ ...empty, ...u, password: '', pincodes: (u.pincodes || []).join(', ') });
    setEditing(u);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') await api.post('/admin/users', form);
      else await api.put(`/admin/users/${editing._id}`, form);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    const where = u.role === 'crm' ? 'back to the new leads list' : 'back to the project manager queue';
    const msg = u.openJobs ? `${u.name} has ${u.openJobs} open item(s). They will go ${where}. Delete this user?` : `Delete ${u.name}?`;
    if (!window.confirm(msg)) return;
    try { await api.delete(`/admin/users/${u._id}`); load(); } catch (e) { setError(errMsg(e)); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const shown = tab === 'all' ? list : list.filter((u) => u.role === tab);
  const count = (r) => (r === 'all' ? list.length : list.filter((u) => u.role === r).length);

  return (
    <>
      <div className="page-head">
        <div><h1>Team</h1><p className="muted">Create logins for CRM, project managers and field inspectors.</p></div>
        <button className="btn btn--primary" onClick={() => open('new')}><Plus size={16} /> Add user</button>
      </div>

      <div className="tabs" role="tablist">
        {['all', ...TEAM_ROLES].map((r) => (
          <button key={r} role="tab" aria-selected={tab === r} className={`tab ${tab === r ? 'tab--on' : ''}`} onClick={() => setTab(r)}>
            {r === 'all' ? 'Everyone' : ROLES[r]} <span>{count(r)}</span>
          </button>
        ))}
      </div>
      {error && <p className="alert alert--error">{error}</p>}

      <div className="panel panel--flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Region</th><th>Pincodes</th><th className="num">Open</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={8} className="empty">No users here yet. Add one to start assigning leads.</td></tr>}
              {shown.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td><span className={`role role--${u.role}`}>{ROLES[u.role]}</span></td>
                  <td>{u.email}<br /><span className="muted">{u.phone || '—'}</span></td>
                  <td>{u.region || '—'}</td>
                  <td className="pins">{u.role === 'manager' ? (u.pincodes?.length ? u.pincodes.join(', ') : <span className="muted">None</span>) : <span className="muted">—</span>}</td>
                  <td className="num">{u.role === 'project_manager' ? '—' : <>{u.openJobs} <span className="muted">/ {u.totalJobs}</span></>}</td>
                  <td><span className={`badge ${u.active ? 'badge--leaf' : 'badge--muted'}`}>{u.active ? 'Active' : 'Disabled'}</span></td>
                  <td className="num nowrap">
                    <button className="icon-btn" onClick={() => open(u)} aria-label={`Edit ${u.name}`}><Pencil size={16} /></button>
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(u)} aria-label={`Delete ${u.name}`}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add user' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <label className="field"><span>Role</span>
              <select value={form.role} onChange={set('role')}>
                {TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
              </select>
              <small>{ROLE_HELP[form.role]}</small>
            </label>
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
            {form.role === 'manager' && (
              <label className="field">
                <span>Pincodes covered</span>
                <textarea rows={2} value={form.pincodes} placeholder="682001, 682011, 682017" onChange={set('pincodes')} />
                <small>Leads from these pincodes will suggest this inspector to the project manager.</small>
              </label>
            )}
            <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Account active</label>
            {formError && <p className="alert alert--error">{formError}</p>}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add user' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}