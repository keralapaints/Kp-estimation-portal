import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import Modal from './Modal';

export default function AssignModal({ appointment, onClose, onDone }) {
  const [managers, setManagers] = useState([]);
  const [managerId, setManagerId] = useState(appointment.assignedTo?._id || appointment.suggestedManager?._id || '');
  const [state, setState] = useState({ busy: false, error: '' });

  useEffect(() => {
    api.get('/admin/managers').then((r) => setManagers(r.data.filter((m) => m.active)));
  }, []);

  const pin = appointment.customer.pincode;
  const sorted = [...managers].sort((a, b) => (b.pincodes?.includes(pin) ? 1 : 0) - (a.pincodes?.includes(pin) ? 1 : 0));

  const save = async () => {
    if (!managerId) return setState({ busy: false, error: 'Choose a manager' });
    setState({ busy: true, error: '' });
    try {
      const { data } = await api.patch(`/admin/appointments/${appointment._id}/assign`, { managerId });
      onDone(data);
    } catch (e) {
      setState({ busy: false, error: errMsg(e) });
    }
  };

  return (
    <Modal title={`Assign ${appointment.refNo}`} onClose={onClose}>
      <p className="muted">{appointment.customer.name}, pincode {pin}</p>
      {!managers.length && <p className="alert alert--info">No active managers yet. Add one under Managers.</p>}
      <div className="pick-list">
        {sorted.map((m) => (
          <label key={m._id} className={`pick ${managerId === m._id ? 'pick--on' : ''}`}>
            <input type="radio" name="manager" value={m._id} checked={managerId === m._id} onChange={() => setManagerId(m._id)} />
            <div>
              <strong>{m.name}</strong>
              <span>{m.region || 'No region'}, {m.openJobs} open job{m.openJobs === 1 ? '' : 's'}</span>
            </div>
            {m.pincodes?.includes(pin) && <span className="badge badge--leaf">Covers {pin}</span>}
          </label>
        ))}
      </div>
      {state.error && <p className="alert alert--error">{state.error}</p>}
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" disabled={state.busy} onClick={save}>{state.busy ? 'Assigning…' : 'Assign manager'}</button>
      </div>
    </Modal>
  );
}
