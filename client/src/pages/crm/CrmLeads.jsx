import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import api, { errMsg } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, areaOf, urgencyLabel } from '../../constants';

const TABS = [
  { key: 'todo', label: 'To verify', statuses: ['crm_assigned'] },
  { key: 'sent', label: 'Sent for inspection', statuses: ['awaiting_inspection', 'assigned', 'scheduled', 'visited', 'estimate_sent', 'revision_requested', 'approved', 'completed'] },
  { key: 'wrong', label: 'Wrong', statuses: ['invalid'] },
  { key: 'all', label: 'All', statuses: null },
];

export default function CrmLeads() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('todo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/crm/appointments').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, []);

  const inTab = (t) => (t.statuses ? items.filter((a) => t.statuses.includes(a.status)) : items);
  const shown = inTab(TABS.find((t) => t.key === tab));

  return (
    <>
      <div className="page-head">
        <div><h1>Hello, {user.name.split(' ')[0]}</h1><p className="muted">Call each lead, check their details, then mark it genuine or wrong.</p></div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'tab--on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span>{inTab(t).length}</span>
          </button>
        ))}
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {!loading && shown.length === 0 && (
        <p className="empty-block">{tab === 'todo' ? 'No leads to verify. New leads appear here when the team lead assigns them to you.' : 'Nothing here.'}</p>
      )}

      <div className="visit-list">
        {shown.map((a) => (
          <article key={a._id} className="visit">
            <div className="visit__top">
              <Link to={`/crm/leads/${a._id}`} className="visit__name">{a.customer.name}</Link>
              <StatusBadge status={a.status} />
            </div>
            <p className="visit__meta">{a.refNo}, booked {fmtDate(a.createdAt, true)}</p>
                        <p className="visit__meta">{a.customer.mobile}, {areaOf(a.customer)}</p>
            {a.urgency && <p className="visit__meta">Wants to paint: <strong>{urgencyLabel(a.urgency)}</strong></p>}
            {a.crmVerification?.note && <p className="visit__meta">Note: {a.crmVerification.note}</p>}
            <div className="visit__actions">
              <a className="btn btn--small btn--ghost" href={`tel:${a.customer.mobile}`}><Phone size={14} /> Call</a>
              <a className="btn btn--small btn--ghost" href={`https://wa.me/91${a.customer.mobile}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              <Link className="btn btn--small btn--primary" to={`/crm/leads/${a._id}`}>{a.status === 'crm_assigned' ? 'Verify' : 'Open'}</Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}