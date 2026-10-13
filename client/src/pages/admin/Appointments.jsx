import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api, { errMsg } from '../../api';
import { STATUS, fmtDate, inr, areaOf, urgencyLabel } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import AssignModal from '../../components/AssignModal';

// Which assignment the team lead can do at each stage
export const assignAction = (a) => {
  if (['new', 'crm_assigned'].includes(a.status)) return { kind: 'crm', label: a.assignedCrm ? 'Reassign CRM' : 'Assign CRM' };
  if (['awaiting_inspection', 'assigned', 'scheduled'].includes(a.status)) return { kind: 'inspector', label: a.assignedTo ? 'Reassign inspector' : 'Assign inspector' };
  return null;
};

export default function AdminAppointments() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [crms, setCrms] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null); // { appointment, kind }

  const status = params.get('status') || '';
  const crm = params.get('crm') || '';
  const manager = params.get('manager') || '';
  const page = Number(params.get('page') || 1);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/appointments', { params: { status, crm, manager, q: params.get('q') || '', page } })
      .then((r) => { setData(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [status, crm, manager, page, params]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/users', { params: { role: 'crm' } }).then((r) => setCrms(r.data));
    api.get('/admin/users', { params: { role: 'manager' } }).then((r) => setInspectors(r.data));
  }, []);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Leads</h1><p className="muted">{data.total} lead{data.total === 1 ? '' : 's'}</p></div>
      </div>

      <div className="filters">
        <form className="search" onSubmit={(e) => { e.preventDefault(); setParam('q', q.trim()); }}>
          <Search size={16} />
          <input placeholder="Search name, mobile, ref or pincode" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <select value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by stage">
          <option value="">All stages</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={crm} onChange={(e) => setParam('crm', e.target.value)} aria-label="Filter by CRM">
          <option value="">All CRM</option>
          <option value="unassigned">No CRM</option>
          {crms.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <select value={manager} onChange={(e) => setParam('manager', e.target.value)} aria-label="Filter by inspector">
          <option value="">All inspectors</option>
          <option value="unassigned">No inspector</option>
          {inspectors.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="panel panel--flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Area</th><th>Stage</th><th>CRM</th><th>Inspector</th><th className="num">Estimate</th><th /></tr>
            </thead>
            <tbody>
              {!loading && data.items.length === 0 && (
                <tr><td colSpan={8} className="empty">No leads match these filters. Clear a filter to see more.</td></tr>
              )}
              {data.items.map((a) => {
                const action = assignAction(a);
                return (
                  <tr key={a._id}>
                    <td><Link className="link" to={`/admin/appointments/${a._id}`}>{a.refNo}</Link><br /><span className="muted">{fmtDate(a.createdAt)}</span></td>
                    <td>{a.customer.name}<br /><span className="muted">{a.customer.mobile}</span></td>
                    <td>
                      {areaOf(a.customer)}
                      {a.urgency && <><br /><span className="muted">{urgencyLabel(a.urgency)}</span></>}
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>{a.assignedCrm?.name || <span className="muted">—</span>}</td>
                    <td>{a.assignedTo?.name || <span className="muted">—</span>}</td>
                    <td className="num">{a.estimate?.total ? inr(a.estimate.total) : '—'}</td>
                    <td className="num">
                      {action && (
                        <button className="btn btn--small btn--outline" onClick={() => setAssigning({ appointment: a, kind: action.kind })}>{action.label}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {assigning && (
        <AssignModal kind={assigning.kind} appointment={assigning.appointment}
          onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />
      )}
    </>
  );
}