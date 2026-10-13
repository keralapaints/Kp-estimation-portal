import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import api, { errMsg } from '../../api';
import { fmtDate, urgencyLabel } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import EstimateOptions from '../../components/EstimateOptions';
import MeasurementSummary from '../../components/MeasurementSummary';
import AssignModal from '../../components/AssignModal';
import History from '../../components/History';
import { assignAction } from './Appointments';

export default function AdminAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null); // 'crm' | 'inspector'

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
  const closed = ['cancelled', 'completed', 'invalid'].includes(a.status);
  const hasEstimate = a.estimate?.options?.length > 0;
  const chosen = hasEstimate && a.estimate.options.find((o) => o.key === a.estimate.selectedOption);

  return (
    <>
      <Link to="/admin/appointments" className="back"><ArrowLeft size={16} /> Leads</Link>
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
              <div><dt>Email</dt><dd>{a.customer.email || '—'}</dd></div>
              <div><dt>District</dt><dd>{a.customer.district || '—'}</dd></div>
              <div><dt>Pincode</dt><dd>{a.customer.pincode || '—'}</dd></div>
              <div><dt>Painting urgency</dt><dd>{urgencyLabel(a.urgency) || '—'}</dd></div>
              <div className="facts__wide"><dt>Address</dt><dd>{a.customer.address || '—'}</dd></div>
              <div><dt>Preferred visit</dt><dd>{a.preferredDate ? fmtDate(a.preferredDate) : 'Any day'}, {a.preferredSlot || 'any time'}</dd></div>
              <div><dt>Scheduled visit</dt><dd>{a.scheduledAt ? fmtDate(a.scheduledAt, true) : '—'}</dd></div>
            </dl>
          </section>

          {a.siteVisit?.sections?.length > 0 && (
            <section className="panel">
              <h2>Site measurements</h2>
              <MeasurementSummary siteVisit={a.siteVisit} />
            </section>
          )}

          {hasEstimate && (
            <section className="panel">
              <div className="panel__head">
                <h2>Average estimate v{a.estimate.version}</h2>
                {a.publicToken && <a className="link" href={`/estimate/${a.publicToken}`} target="_blank" rel="noreferrer">Customer's link <ExternalLink size={14} /></a>}
              </div>
              <EstimateOptions estimate={a.estimate} />
            </section>
          )}
        </div>

        <div className="stack">
          <section className="panel">
            <h2>CRM verification</h2>
            {a.assignedCrm ? (
              <p><strong>{a.assignedCrm.name}</strong><br /><span className="muted">{a.assignedCrm.phone || a.assignedCrm.email}</span></p>
            ) : <p className="muted">No CRM assigned yet.</p>}
            {a.crmVerification?.result && (
              <div className="note">
                <strong>{a.crmVerification.result === 'wrong' ? 'Wrong lead' : 'Genuine: waiting for site inspection'}</strong>
                <span className="muted"> on {fmtDate(a.crmVerification.at, true)}</span>
                {a.crmVerification.note && <p>{a.crmVerification.note}</p>}
              </div>
            )}
            {assignAction(a)?.kind === 'crm' && (
              <button className="btn btn--primary btn--block" onClick={() => setAssigning('crm')}>{assignAction(a).label}</button>
            )}
          </section>

          <section className="panel">
            <h2>Field inspector</h2>
            {a.assignedTo ? (
              <p><strong>{a.assignedTo.name}</strong><br /><span className="muted">{a.assignedTo.phone || a.assignedTo.email}</span>
                {a.inspectionAssignedBy && <><br /><span className="muted">Assigned by {a.inspectionAssignedBy.name}</span></>}</p>
            ) : (
              <p className="muted">
                {a.status === 'awaiting_inspection' ? 'Waiting for a project manager to assign an inspector.' : 'Assigned after CRM verifies the lead.'}
                {a.suggestedManager ? ` ${a.suggestedManager.name} covers this pincode.` : ''}
              </p>
            )}
            {assignAction(a)?.kind === 'inspector' && (
              <button className="btn btn--outline btn--block" onClick={() => setAssigning('inspector')}>{assignAction(a).label}</button>
            )}
          </section>

          {a.customerResponse?.action && (
            <section className="panel">
              <h2>Customer response</h2>
              <p>
                <strong>{a.customerResponse.action === 'approve' ? `Chose ${chosen?.label || 'an option'}` : 'Asked for changes'}</strong>
                {' '}on {fmtDate(a.customerResponse.at, true)}
              </p>
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
              {['cancelled', 'invalid'].includes(a.status) && <button className="btn btn--outline" onClick={() => setStatus('new')}>Reopen as new lead</button>}
              <button className="btn btn--ghost btn--danger" onClick={remove}>Delete</button>
            </div>
          </section>
        </div>
      </div>

      {assigning && <AssignModal kind={assigning} appointment={a} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />}
    </>
  );
}