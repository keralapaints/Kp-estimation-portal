import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, MessageCircle } from 'lucide-react';
import api, { errMsg } from '../../api';
import { fmtDate, inr } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { key: 'todo', label: 'To schedule', statuses: ['assigned'] },
  { key: 'visits', label: 'Upcoming visits', statuses: ['scheduled'] },
  { key: 'estimates', label: 'Estimates', statuses: ['visited', 'revision_requested', 'estimate_sent'] },
  { key: 'done', label: 'Approved and done', statuses: ['approved', 'completed'] },
  { key: 'all', label: 'All', statuses: null },
];

export default function MyAppointments() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('todo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/manager/appointments').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, []);

  const count = (t) => (t.statuses ? items.filter((a) => t.statuses.includes(a.status)).length : items.length);
  const current = TABS.find((t) => t.key === tab);
  let shown = current.statuses ? items.filter((a) => current.statuses.includes(a.status)) : items;
  if (tab === 'visits') shown = [...shown].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  return (
    <>
      <div className="page-head">
        <div><h1>Hello, {user.name.split(' ')[0]}</h1><p className="muted">{items.length} site visit{items.length === 1 ? '' : 's'} assigned to you</p></div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'tab--on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span>{count(t)}</span>
          </button>
        ))}
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {!loading && shown.length === 0 && <p className="empty-block">Nothing here right now. New visits appear when a project manager assigns them to you.</p>}

      <div className="visit-list">
        {shown.map((a) => (
          <article key={a._id} className={`visit ${a.status === 'revision_requested' ? 'visit--alert' : ''}`}>
            <div className="visit__top">
              <Link to={`/manager/appointments/${a._id}`} className="visit__name">{a.customer.name}</Link>
              <StatusBadge status={a.status} />
            </div>
            <p className="visit__meta"><MapPin size={14} /> {a.customer.address || 'No address given'}, {a.customer.pincode}</p>
            <p className="visit__meta">
              {a.scheduledAt ? `Visit on ${fmtDate(a.scheduledAt, true)}` : `Prefers ${a.preferredDate ? fmtDate(a.preferredDate) : 'any day'}, ${a.preferredSlot || 'any time'}`}
              {a.estimate?.total ? `. Estimate ${inr(a.estimate.total)}` : ''}
            </p>
            <div className="visit__actions">
              <a className="btn btn--small btn--ghost" href={`tel:${a.customer.mobile}`}><Phone size={14} /> Call</a>
              <a className="btn btn--small btn--ghost" href={`https://wa.me/91${a.customer.mobile}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              <Link className="btn btn--small btn--primary" to={`/manager/appointments/${a._id}`}>Open</Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
