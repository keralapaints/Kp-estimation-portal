import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Printer } from 'lucide-react';
import customerApi from '../../customerApi';
import { errMsg } from '../../api';
import ProgressTracker from '../../components/ProgressTracker';
import EstimateOptions from '../../components/EstimateOptions';
import MeasurementSummary from '../../components/MeasurementSummary';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate, inr, sqft } from '../../constants';

export default function CustomerBooking() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [revising, setRevising] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    customerApi.get(`/appointments/${id}`).then((r) => setA(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  const respond = async (body) => {
    setBusy(true);
    setActionError('');
    try {
      const { data } = await customerApi.post(`/appointments/${id}/respond`, body);
      setA(data);
      setRevising(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const choose = (o) => {
    if (!window.confirm(`Go ahead with the ${o.label} option for ${inr(Math.round(o.total))} (incl. GST)?`)) return;
    respond({ action: 'approve', option: o.key });
  };

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!a) return <div className="page-loading">Loading…</div>;
  const est = a.estimate?.options?.length ? a.estimate : null;
  const chosen = est?.options.find((o) => o.key === est.selectedOption);

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

        {a.status === 'approved' && chosen && <p className="alert alert--ok">You chose the <strong>{chosen.label}</strong> option. Your inspector will contact you to schedule the painting work.</p>}
        {a.status === 'revision_requested' && <p className="alert alert--info">We received your change request. You will get an updated estimate on WhatsApp.</p>}
        {a.status === 'scheduled' && <p className="alert alert--info">Site visit on <strong>{fmtDate(a.scheduledAt, true)}</strong>.</p>}
        {a.status === 'visited' && <p className="alert alert--info">Your inspector has measured the site and is preparing your estimate.</p>}

        {a.manager && (
          <div className="manager-card">
            <div><span className="muted">Your Kerala Paints inspector</span><strong>{a.manager.name}</strong></div>
            {a.manager.phone && <a className="btn btn--outline btn--small" href={`tel:${a.manager.phone}`}><Phone size={14} /> Call {a.manager.phone}</a>}
          </div>
        )}
      </section>

      {est ? (
        <>
          <section className="estimate-hero">
            <div>
              <span>{chosen ? `Your ${chosen.label} estimate` : 'Your painting estimate'}</span>
              <strong>
                {chosen
                  ? inr(Math.round(chosen.total))
                  : `${inr(Math.round(Math.min(...est.options.map((o) => o.total))))} – ${inr(Math.round(Math.max(...est.options.map((o) => o.total))))}`}
              </strong>
              <span>including GST, for {sqft(est.totalSqft)}. Version {est.version}, prepared {fmtDate(est.generatedAt)}</span>
            </div>
            <button className="btn btn--outline no-print" onClick={() => window.print()}><Printer size={16} /> Save as PDF</button>
          </section>

          <section className="panel">
            <h2>{a.status === 'estimate_sent' ? 'Choose your option' : 'Your options'}</h2>
            {a.status === 'estimate_sent' && <p className="muted">Each option covers the same work. They differ in the paint range used.</p>}
            <EstimateOptions estimate={est} onChoose={a.status === 'estimate_sent' ? choose : undefined} busy={busy} />
            {actionError && <p className="alert alert--error">{actionError}</p>}

            {a.status === 'estimate_sent' && (
              <div className="decision no-print">
                {!revising ? (
                  <button className="btn btn--ghost" onClick={() => setRevising(true)}>None of these? Request changes</button>
                ) : (
                  <>
                    <label className="field"><span>What would you like changed?</span>
                      <textarea rows={3} value={comment} placeholder="e.g. Skip the bedroom, lower budget, different colour"
                        onChange={(e) => setComment(e.target.value)} />
                    </label>
                    <div className="decision__actions">
                      <button className="btn btn--primary" disabled={busy} onClick={() => respond({ action: 'revise', comment })}>Send request</button>
                      <button className="btn btn--ghost" onClick={() => setRevising(false)}>Back</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <details className="panel measured">
            <summary><h2>What we measured</h2><span className="muted">{sqft(est.totalSqft)}</span></summary>
            <MeasurementSummary siteVisit={a.siteVisit} />
          </details>
          <p className="fine">Prices include materials and labour. Final quantities may vary slightly on site. Estimate valid for 30 days.</p>
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