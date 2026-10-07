import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api, { errMsg } from '../../api';
import { STATUS, fmtDate, inr } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import AssignModal from '../../components/AssignModal';

export default function AdminAppointments() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [managers, setManagers] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null);

  const status = params.get('status') || '';
  const manager = params.get('manager') || '';
  const page = Number(params.get('page') || 1);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/appointments', { params: { status, manager, q: params.get('q') || '', page } })
      .then((r) => { setData(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [status, manager, page, params]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/admin/managers').then((r) => setManagers(r.data)); }, []);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Appointments</h1><p className="muted">{data.total} booking{data.total === 1 ? '' : 's'}</p></div>
      </div>

      <div className="filters">
        <form className="search" onSubmit={(e) => { e.preventDefault(); setParam('q', q.trim()); }}>
          <Search size={16} />
          <input placeholder="Search name, mobile, ref or pincode" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <select value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by status">
          <option value="">All stages</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={manager} onChange={(e) => setParam('manager', e.target.value)} aria-label="Filter by manager">
          <option value="">All managers</option>
          <option value="unassigned">Unassigned</option>
          {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="panel panel--flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Pincode</th><th>Preferred visit</th><th>Stage</th><th>Manager</th><th className="num">Estimate</th><th /></tr>
            </thead>
            <tbody>
              {!loading && data.items.length === 0 && (
                <tr><td colSpan={8} className="empty">No bookings match these filters. Clear a filter to see more.</td></tr>
              )}
              {data.items.map((a) => (
                <tr key={a._id}>
                  <td><Link className="link" to={`/admin/appointments/${a._id}`}>{a.refNo}</Link><br /><span className="muted">{fmtDate(a.createdAt)}</span></td>
                  <td>{a.customer.name}<br /><span className="muted">{a.customer.mobile}</span></td>
                  <td>{a.customer.pincode}</td>
                  <td>{a.preferredDate ? fmtDate(a.preferredDate) : 'Any day'}<br /><span className="muted">{a.preferredSlot || 'Any time'}</span></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.assignedTo?.name || <span className="muted">{a.suggestedManager ? `Suggested: ${a.suggestedManager.name}` : 'Unassigned'}</span>}</td>
                  <td className="num">{a.estimate?.total ? inr(a.estimate.total) : '—'}</td>
                  <td className="num">
                    {!['cancelled', 'completed'].includes(a.status) && (
                      <button className="btn btn--small btn--outline" onClick={() => setAssigning(a)}>{a.assignedTo ? 'Reassign' : 'Assign'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.pages > 1 && (
        <div className="pager">
          <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setParam('page', page - 1)}>Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button className="btn btn--ghost" disabled={page >= data.pages} onClick={() => setParam('page', page + 1)}>Next</button>
        </div>
      )}

      {assigning && <AssignModal appointment={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />}
    </>
  );
}
