import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Printer } from 'lucide-react';
import customerApi from '../../customerApi';
import { errMsg } from '../../api';
import ProgressTracker from '../../components/ProgressTracker';
import EstimateTable from '../../components/EstimateTable';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate, surfaceLabel, tierLabel, TIERS } from '../../constants';

export default function CustomerBooking() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [revising, setRevising] = useState(false);
  const [form, setForm] = useState({ comment: '', requestedTier: '' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    customerApi.get(`/appointments/${id}`).then((r) => setA(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  const respond = async (action) => {
    if (action === 'approve' && !window.confirm(`Approve this estimate of ₹${Math.round(a.estimate.total).toLocaleString('en-IN')}?`)) return;
    setBusy(true);
    setActionError('');
    try {
      const { data } = await customerApi.post(`/appointments/${id}/respond`, { action, ...form });
      setA(data);
      setRevising(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!a) return <div className="page-loading">Loading…</div>;
  const est = a.estimate;

  return (
    <>
      <Link to="/my" className="back no-print"><ArrowLeft size={16} /> My bookings</Link>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h1 className="portal__title">Booking {a.refNo}</h1>
            <p className="muted">Booked {fmtDate(a.createdAt, true)}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>
        <ProgressTracker status={a.status} />

        {a.status === 'approved' && <p className="alert alert--ok">You approved this estimate. Your manager will contact you to schedule the painting work.</p>}
        {a.status === 'revision_requested' && <p className="alert alert--info">We received your change request. You will get an updated estimate on WhatsApp.</p>}
        {a.status === 'scheduled' && <p className="alert alert--info">Site visit on <strong>{fmtDate(a.scheduledAt, true)}</strong>.</p>}
        {a.status === 'visited' && <p className="alert alert--info">Your manager has measured the site and is preparing your estimate.</p>}

        {a.manager && (
          <div className="manager-card">
            <div><span className="muted">Your Kerala Paints manager</span><strong>{a.manager.name}</strong></div>
            {a.manager.phone && <a className="btn btn--outline btn--small" href={`tel:${a.manager.phone}`}><Phone size={14} /> Call {a.manager.phone}</a>}
          </div>
        )}
      </section>

      {est ? (
        <>
          <section className="estimate-hero">
            <div>
              <span>Your painting estimate</span>
              <strong>₹{Math.round(est.total).toLocaleString('en-IN')}</strong>
              <span>including GST, for {est.totalArea} sq ft. Version {est.version}, prepared {fmtDate(est.generatedAt)}</span>
            </div>
            <button className="btn btn--outline no-print" onClick={() => window.print()}><Printer size={16} /> Save as PDF</button>
          </section>

          {a.status === 'estimate_sent' && (
            <section className="panel decision-panel no-print">
              {!revising ? (
                <>
                  <h2>Happy with this estimate?</h2>
                  <p className="muted">Approve it and your manager will schedule the work, or ask for changes such as a different product range.</p>
                  <div className="decision__actions">
                    <button className="btn btn--primary" disabled={busy} onClick={() => respond('approve')}>Approve estimate</button>
                    <button className="btn btn--outline" onClick={() => setRevising(true)}>Request changes</button>
                  </div>
                </>
              ) : (
                <>
                  <h2>What would you like changed?</h2>
                  <label className="field"><span>Switch product range (optional)</span>
                    <select value={form.requestedTier} onChange={(e) => setForm({ ...form, requestedTier: e.target.value })}>
                      <option value="">Keep as is</option>
                      {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Your note</span>
                    <textarea rows={3} value={form.comment} placeholder="e.g. Skip the bedroom, use luxury paint for the hall"
                      onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                  </label>
                  <div className="decision__actions">
                    <button className="btn btn--primary" disabled={busy} onClick={() => respond('revise')}>Send request</button>
                    <button className="btn btn--ghost" onClick={() => setRevising(false)}>Back</button>
                  </div>
                </>
              )}
              {actionError && <p className="alert alert--error">{actionError}</p>}
            </section>
          )}

          <section className="panel">
            <h2>What we measured</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Surface</th><th className="col-type">Type</th><th>Range</th><th className="num">Area</th><th>Condition</th></tr></thead>
                <tbody>
                  {a.surfaces.map((s, i) => (
                    <tr key={s._id || i}>
                      <td>{s.label || `Surface ${i + 1}`}</td>
                      <td className="col-type">{surfaceLabel(s.surfaceType)}</td>
                      <td>{tierLabel(s.tier)}</td>
                      <td className="num">{s.area} sq ft</td>
                      <td>{[s.condition?.dampness !== 'none' && `${s.condition.dampness} damp`, s.condition?.cracks && 'cracks', s.condition?.flaking && 'flaking'].filter(Boolean).join(', ') || 'Good'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Itemised estimate</h2>
            <EstimateTable estimate={est} />
          </section>
          <p className="fine">Prices include materials, surface preparation and labour. Final quantities may vary slightly on site. Estimate valid for 30 days.</p>
        </>
      ) : (
        <section className="panel">
          <h2>Estimate</h2>
          <p className="muted">Your estimate appears here after the site visit. We will also send it to you on WhatsApp.</p>
        </section>
      )}
    </>
  );
}