import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import api, { errMsg } from '../../api';
import { fmtDate, surfaceLabel, tierLabel } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import EstimateTable from '../../components/EstimateTable';
import AssignModal from '../../components/AssignModal';
import History from '../../components/History';

export default function AdminAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = () => api.get(`/admin/appointments/${id}`).then((r) => setA(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (status) => {
    const note = status === 'cancelled' ? window.prompt('Reason for cancelling (optional)') : '';
    if (note === null) return;
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status, note });
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this appointment permanently?')) return;
    try {
      await api.delete(`/admin/appointments/${id}`);
      navigate('/admin/appointments');
    } catch (e) { setError(errMsg(e)); }
  };

  if (error && !a) return <p className="alert alert--error">{error}</p>;
  if (!a) return <div className="page-loading">Loading…</div>;
  const closed = ['cancelled', 'completed'].includes(a.status);
  const surfaces = a.siteVisit?.surfaces || [];

  return (
    <>
      <Link to="/admin/appointments" className="back"><ArrowLeft size={16} /> Appointments</Link>
      <div className="page-head">
        <div>
          <h1>{a.customer.name}</h1>
          <p className="muted">{a.refNo}, booked {fmtDate(a.createdAt, true)}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      {error && <p className="alert alert--error">{error}</p>}

      <div className="split">
        <div className="stack">
          <section className="panel">
            <h2>Customer</h2>
            <dl className="facts">
              <div><dt>Mobile</dt><dd><a className="link" href={`tel:${a.customer.mobile}`}>{a.customer.mobile}</a></dd></div>
              <div><dt>Email</dt><dd>{a.customer.email}</dd></div>
              <div><dt>Pincode</dt><dd>{a.customer.pincode}</dd></div>
              <div><dt>WhatsApp updates</dt><dd>{a.whatsappOptIn ? 'Yes' : 'No'}</dd></div>
              <div className="facts__wide"><dt>Address</dt><dd>{a.customer.address || '—'}</dd></div>
              <div><dt>Preferred visit</dt><dd>{a.preferredDate ? fmtDate(a.preferredDate) : 'Any day'}, {a.preferredSlot || 'any time'}</dd></div>
              <div><dt>Scheduled visit</dt><dd>{a.scheduledAt ? fmtDate(a.scheduledAt, true) : '—'}</dd></div>
            </dl>
          </section>

          {surfaces.length > 0 && (
            <section className="panel">
              <h2>Site visit</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Surface</th><th>Type</th><th>Range</th><th className="num">Area</th><th>Condition</th></tr></thead>
                  <tbody>
                    {surfaces.map((s) => (
                      <tr key={s._id}>
                        <td>{s.label || '—'}</td><td>{surfaceLabel(s.surfaceType)}</td><td>{tierLabel(s.tier)}</td>
                        <td className="num">{s.area} sq ft</td>
                        <td>{[s.condition.dampness !== 'none' && `${s.condition.dampness} damp`, s.condition.cracks && 'cracks', s.condition.flaking && 'flaking'].filter(Boolean).join(', ') || 'Good'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {a.siteVisit.notes && <p className="note"><strong>Manager notes:</strong> {a.siteVisit.notes}</p>}
            </section>
          )}

          {a.estimate?.total > 0 && (
            <section className="panel">
              <div className="panel__head">
                <h2>Estimate v{a.estimate.version}</h2>
                {a.publicToken && <a className="link" href={`/estimate/${a.publicToken}`} target="_blank" rel="noreferrer">Customer view <ExternalLink size={14} /></a>}
              </div>
              <EstimateTable estimate={a.estimate} />
            </section>
          )}
        </div>

        <div className="stack">
          <section className="panel">
            <h2>Manager</h2>
            {a.assignedTo ? (
              <p><strong>{a.assignedTo.name}</strong><br /><span className="muted">{a.assignedTo.phone || a.assignedTo.email}</span></p>
            ) : (
              <p className="muted">Not assigned{a.suggestedManager ? `. ${a.suggestedManager.name} covers this pincode.` : '.'}</p>
            )}
            {!closed && <button className="btn btn--primary btn--block" onClick={() => setAssigning(true)}>{a.assignedTo ? 'Reassign manager' : 'Assign manager'}</button>}
          </section>

          {a.customerResponse?.action && (
            <section className="panel">
              <h2>Customer response</h2>
              <p><strong>{a.customerResponse.action === 'approve' ? 'Approved' : 'Asked for changes'}</strong> on {fmtDate(a.customerResponse.at, true)}</p>
              {a.customerResponse.requestedTier && <p>Wants the {a.customerResponse.requestedTier} range</p>}
              {a.customerResponse.comment && <p className="note">{a.customerResponse.comment}</p>}
            </section>
          )}

          <section className="panel">
            <h2>Activity</h2>
            <History items={a.history} />
          </section>

          <section className="panel panel--quiet">
            <h2>Admin actions</h2>
            <div className="btn-row">
              {a.status === 'approved' && <button className="btn btn--outline" onClick={() => setStatus('completed')}>Mark completed</button>}
              {!closed && <button className="btn btn--outline btn--danger" onClick={() => setStatus('cancelled')}>Cancel booking</button>}
              {a.status === 'cancelled' && <button className="btn btn--outline" onClick={() => setStatus('new')}>Reopen</button>}
              <button className="btn btn--ghost btn--danger" onClick={remove}>Delete</button>
            </div>
          </section>
        </div>
      </div>

      {assigning && <AssignModal appointment={a} onClose={() => setAssigning(false)} onDone={() => { setAssigning(false); load(); }} />}
    </>
  );
}
