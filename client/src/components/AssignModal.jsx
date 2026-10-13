import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import Modal from './Modal';
import { areaOf } from '../constants';

/*
  kind  = 'crm'       -> team lead assigns a CRM          (admin only)
  kind  = 'inspector' -> assign a field inspector          (admin or project manager)
  scope = 'admin' | 'pm' decides which API is used
*/
const CONFIG = {
  crm: {
    title: 'Assign CRM',
    list: () => api.get('/admin/users', { params: { role: 'crm' } }),
    assign: (id, userId) => api.patch(`/admin/appointments/${id}/assign-crm`, { crmId: userId }),
    current: (a) => a.assignedCrm?._id || a.assignedCrm,
    load: (u) => `${u.openJobs} lead${u.openJobs === 1 ? '' : 's'} to verify`,
  },
  inspector: {
    title: 'Assign field inspector',
    list: (scope) => (scope === 'pm' ? api.get('/pm/inspectors') : api.get('/admin/users', { params: { role: 'manager' } })),
    assign: (id, userId, scope) => api.patch(`/${scope === 'pm' ? 'pm' : 'admin'}/appointments/${id}/assign`, { managerId: userId }),
    current: (a) => a.assignedTo?._id || a.assignedTo || a.suggestedManager?._id,
    load: (u) => `${u.openJobs} open visit${u.openJobs === 1 ? '' : 's'}`,
  },
};

export default function AssignModal({ appointment, kind = 'inspector', scope = 'admin', onClose, onDone }) {
  const cfg = CONFIG[kind];
  const [people, setPeople] = useState([]);
  const [userId, setUserId] = useState(String(cfg.current(appointment) || ''));
  const [state, setState] = useState({ busy: false, error: '' });

  useEffect(() => {
    cfg.list(scope).then((r) => setPeople(r.data.filter((u) => u.active !== false))).catch((e) => setState({ busy: false, error: errMsg(e) }));
  }, [kind, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const pin = appointment.customer.pincode;
  const covers = (u) => kind === 'inspector' && !!pin && u.pincodes?.includes(pin);
  const sorted = [...people].sort((a, b) => (covers(b) ? 1 : 0) - (covers(a) ? 1 : 0) || a.openJobs - b.openJobs);

  const save = async () => {
    if (!userId) return setState({ busy: false, error: 'Choose someone to assign' });
    setState({ busy: true, error: '' });
    try {
      const { data } = await cfg.assign(appointment._id, userId, scope);
      onDone(data);
    } catch (e) {
      setState({ busy: false, error: errMsg(e) });
    }
  };

  return (
    <Modal title={`${cfg.title}: ${appointment.refNo}`} onClose={onClose}>
            <p className="muted">{appointment.customer.name}, {areaOf(appointment.customer)}</p>
      {!people.length && !state.error && (
        <p className="alert alert--info">No active {kind === 'crm' ? 'CRM users' : 'field inspectors'} yet. Add them under Team.</p>
      )}
      <div className="pick-list">
        {sorted.map((u) => (
          <label key={u._id} className={`pick ${userId === String(u._id) ? 'pick--on' : ''}`}>
            <input type="radio" name="assignee" value={u._id} checked={userId === String(u._id)} onChange={() => setUserId(String(u._id))} />
            <div>
              <strong>{u.name}</strong>
              <span>{u.region ? `${u.region}, ` : ''}{cfg.load(u)}</span>
            </div>
            {covers(u) && <span className="badge badge--leaf">Covers {pin}</span>}
          </label>
        ))}
      </div>
      {state.error && <p className="alert alert--error">{state.error}</p>}
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" disabled={state.busy} onClick={save}>{state.busy ? 'Assigning…' : 'Assign'}</button>
      </div>
    </Modal>
  );
}
