import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api';
import { PIPELINE, STATUS, inr, fmtDate } from '../../constants';
import AssignModal from '../../components/AssignModal';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null);

  const load = () => api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!stats) return <div className="page-loading">Loading…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">{stats.managers} active manager{stats.managers === 1 ? '' : 's'}, {inr(stats.approvedValue)} in approved estimates</p>
        </div>
      </div>

      <section className="pipeline" aria-label="Jobs by stage">
        {PIPELINE.map((s) => (
          <Link key={s} to={`/admin/appointments?status=${s}`} className={`pipeline__stage tone--${STATUS[s].tone}`}>
            <strong>{stats.counts[s] || 0}</strong>
            <span>{STATUS[s].label}</span>
          </Link>
        ))}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Waiting for a manager</h2>
          <Link to="/admin/appointments?manager=unassigned" className="link">See all</Link>
        </div>
        {stats.unassigned.length === 0 ? (
          <p className="muted">Every booking has a manager. New bookings will appear here.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ref</th><th>Customer</th><th>Pincode</th><th>Booked</th><th>Suggested</th><th /></tr></thead>
              <tbody>
                {stats.unassigned.map((a) => (
                  <tr key={a._id}>
                    <td><Link className="link" to={`/admin/appointments/${a._id}`}>{a.refNo}</Link></td>
                    <td>{a.customer.name}<br /><span className="muted">{a.customer.mobile}</span></td>
                    <td>{a.customer.pincode}</td>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td>{a.suggestedManager?.name || <span className="muted">No match</span>}</td>
                    <td className="num"><button className="btn btn--small btn--primary" onClick={() => setAssigning(a)}>Assign</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {assigning && <AssignModal appointment={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />}
    </>
  );
}
