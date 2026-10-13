import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api';
import { PIPELINE, STATUS, inr, fmtDate, areaOf, urgencyLabel } from '../../constants';
import AssignModal from '../../components/AssignModal';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null);

  const load = () => api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!stats) return <div className="page-loading">Loading…</div>;
  const t = stats.team;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">
            {t.crm || 0} CRM, {t.project_manager || 0} project manager{t.project_manager === 1 ? '' : 's'}, {t.manager || 0} field inspector{t.manager === 1 ? '' : 's'}.
            {' '}{inr(stats.approvedValue)} in approved estimates.
          </p>
        </div>
      </div>

      <section className="pipeline" aria-label="Leads by stage">
        {PIPELINE.map((s) => (
          <Link key={s} to={`/admin/appointments?status=${s}`} className={`pipeline__stage tone--${STATUS[s].tone}`}>
            <strong>{stats.counts[s] || 0}</strong>
            <span>{STATUS[s].label}</span>
          </Link>
        ))}
      </section>
      {(stats.counts.invalid || 0) > 0 && (
        <p className="muted">
          <Link className="link" to="/admin/appointments?status=invalid">{stats.counts.invalid} wrong lead{stats.counts.invalid === 1 ? '' : 's'}</Link> closed by CRM.
        </p>
      )}

      <section className="panel">
        <div className="panel__head">
          <h2>New leads waiting for a CRM</h2>
          <Link to="/admin/appointments?status=new" className="link">See all</Link>
        </div>
        {stats.newLeads.length === 0 ? (
          <p className="muted">Every new lead has a CRM. New bookings will appear here.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ref</th><th>Customer</th><th>Area</th><th>Urgency</th><th>Booked</th><th /></tr></thead>
              <tbody>
                {stats.newLeads.map((a) => (
                  <tr key={a._id}>
                    <td><Link className="link" to={`/admin/appointments/${a._id}`}>{a.refNo}</Link></td>
                    <td>{a.customer.name}<br /><span className="muted">{a.customer.mobile}</span></td>
                    <td>{areaOf(a.customer)}</td>
                    <td>{urgencyLabel(a.urgency) || <span className="muted">—</span>}</td>
                    <td>{fmtDate(a.createdAt, true)}</td>
                    <td className="num"><button className="btn btn--small btn--primary" onClick={() => setAssigning(a)}>Assign CRM</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {assigning && <AssignModal kind="crm" appointment={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />}
    </>
  );
}