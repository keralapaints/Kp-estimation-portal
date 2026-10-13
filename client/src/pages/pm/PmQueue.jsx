import { useEffect, useState, useCallback } from 'react';
import { Phone, MapPin } from 'lucide-react';
import api, { errMsg } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import AssignModal from '../../components/AssignModal';
import { fmtDate, areaOf, urgencyLabel } from '../../constants';

const TABS = [
  { key: 'queue', label: 'Waiting for inspector' },
  { key: 'mine', label: 'Assigned by me' },
];

export default function PmQueue() {
  const [tab, setTab] = useState('queue');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/pm/appointments', { params: { view: tab } })
      .then((r) => { setItems(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-head">
        <div><h1>Inspection queue</h1><p className="muted">Leads verified by CRM as genuine. Assign each one to a field inspector.</p></div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'tab--on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}{tab === t.key && !loading && <span>{items.length}</span>}
          </button>
        ))}
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {!loading && items.length === 0 && (
        <p className="empty-block">{tab === 'queue' ? 'No leads waiting. Verified leads from CRM appear here.' : 'You have not assigned any leads yet.'}</p>
      )}

      <div className="visit-list">
        {items.map((a) => (
          <article key={a._id} className="visit">
            <div className="visit__top">
              <span className="visit__name">{a.customer.name}</span>
              <StatusBadge status={a.status} />
            </div>
            <p className="visit__meta"><MapPin size={14} /> {[a.customer.address, areaOf(a.customer)].filter((x) => x && x !== '—').join(', ') || 'No address given'}</p>
            {a.urgency && <p className="visit__meta">Wants to paint: <strong>{urgencyLabel(a.urgency)}</strong></p>}
            <p className="visit__meta">
              {a.refNo}. Prefers {a.preferredDate ? fmtDate(a.preferredDate) : 'any day'}, {a.preferredSlot || 'any time'}.
            </p>
            <p className="visit__meta">Verified by {a.assignedCrm?.name || 'CRM'}{a.crmVerification?.at ? ` on ${fmtDate(a.crmVerification.at)}` : ''}</p>
            {a.crmVerification?.note && <p className="note">{a.crmVerification.note}</p>}
            {tab === 'mine' && a.assignedTo && <p className="visit__meta"><strong>Inspector: {a.assignedTo.name}</strong></p>}
            {tab === 'queue' && a.suggestedManager && <p className="visit__meta">Suggested: {a.suggestedManager.name} (covers {a.customer.pincode})</p>}
            <div className="visit__actions">
              <a className="btn btn--small btn--ghost" href={`tel:${a.customer.mobile}`}><Phone size={14} /> Call</a>
              {['awaiting_inspection', 'assigned', 'scheduled'].includes(a.status) && (
                <button className="btn btn--small btn--primary" onClick={() => setAssigning(a)}>
                  {a.assignedTo ? 'Reassign inspector' : 'Assign inspector'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {assigning && (
        <AssignModal kind="inspector" scope="pm" appointment={assigning}
          onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />
      )}
    </>
  );
}