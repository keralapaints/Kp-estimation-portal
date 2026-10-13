import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Copy, ExternalLink } from 'lucide-react';
import api, { errMsg } from '../../api';
import { fmtDate, areaOf, urgencyLabel } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import MeasurementForm, { withKeys, sectionSqft } from '../../components/MeasurementForm';
import EstimateOptions from '../../components/EstimateOptions';
import History from '../../components/History';

const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// What gets sent to the server (React keys removed)
const toPayload = (v) => ({
  categories: v.categories,
  notes: v.notes,
  sections: v.sections.map((sec) => ({
    category: sec.category,
    areas: sec.areas.map(({ key, ...a }) => ({
      ...a,
      surfaces: a.surfaces.map(({ key: _k, ...s }) => ({ ...s, deductions: s.deductions.map(({ key: _d, ...d }) => d) })),
    })),
  })),
});

export default function VisitDetail() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [visit, setVisit] = useState({ categories: [], sections: [], notes: '' });
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [busy, setBusy] = useState('');
  const debounce = useRef();

  const hydrate = (data, { keepVisit = false } = {}) => {
    setA(data);
    setScheduledAt(toLocalInput(data.scheduledAt || data.preferredDate));
    if (!keepVisit) setVisit(withKeys(data.siteVisit));
  };

  useEffect(() => {
    api.get(`/manager/appointments/${id}`).then((r) => hydrate(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  // Live estimate preview while measurements are typed
  useEffect(() => {
    if (!a) return;
    clearTimeout(debounce.current);
    if (!visit.sections.some((s) => sectionSqft(s) > 0)) { setPreview(null); setPreviewError(''); return; }
    debounce.current = setTimeout(() => {
      api.post(`/manager/appointments/${id}/preview-estimate`, toPayload(visit))
        .then((r) => { setPreview(r.data.estimate); setPreviewError(''); })
        .catch((e) => setPreviewError(errMsg(e)));
    }, 600);
    return () => clearTimeout(debounce.current);
  }, [visit, a, id]);

  const run = async (key, fn, ok) => {
    setBusy(key); setError(''); setFlash('');
    try { await fn(); if (ok) setFlash(ok); } catch (e) { setError(errMsg(e)); } finally { setBusy(''); }
  };

  const schedule = () => run('schedule', async () => {
    const { data } = await api.patch(`/manager/appointments/${id}/schedule`, { scheduledAt: new Date(scheduledAt).toISOString() });
    hydrate({ ...a, ...data }, { keepVisit: true });
  }, 'Visit scheduled');

  const saveVisit = (e) => {
    e.preventDefault();
    run('save', async () => {
      const { data } = await api.put(`/manager/appointments/${id}/site-visit`, toPayload(visit));
      hydrate(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 'Measurements saved and estimate generated');
  };

  const sendEstimate = async () => {
    const win = window.open('', '_blank'); // opened now so pop-up blockers allow it
    setBusy('send'); setError(''); setFlash('');
    try {
      const { data } = await api.patch(`/manager/appointments/${id}/send-estimate`);
      hydrate(data, { keepVisit: true });
      if (win) win.location.href = data.whatsappUrl; else window.location.href = data.whatsappUrl;
      setFlash('Estimate marked as sent');
    } catch (err) {
      win?.close();
      setError(errMsg(err));
    } finally { setBusy(''); }
  };

  const complete = () => run('complete', async () => {
    const { data } = await api.patch(`/manager/appointments/${id}/complete`);
    hydrate({ ...a, ...data }, { keepVisit: true });
  }, 'Job marked completed');

  const copyLink = async () => {
    await navigator.clipboard.writeText(a.shareUrl);
    setFlash('Estimate link copied');
  };

  if (error && !a) return <p className="alert alert--error">{error}</p>;
  if (!a) return <div className="page-loading">Loading…</div>;

  const locked = ['approved', 'completed', 'cancelled'].includes(a.status);
  const canSchedule = ['assigned', 'scheduled'].includes(a.status);
  const canSend = a.estimate?.options?.length && ['visited', 'estimate_sent', 'revision_requested'].includes(a.status);
  const shown = preview || (a.estimate?.options?.length ? a.estimate : null);

  return (
    <>
      <Link to="/manager" className="back"><ArrowLeft size={16} /> My site visits</Link>
      <div className="page-head">
        <div><h1>{a.customer.name}</h1><p className="muted">{a.refNo}</p></div>
        <StatusBadge status={a.status} />
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {flash && <p className="alert alert--ok" role="status">{flash}</p>}
      {a.status === 'revision_requested' && (
        <div className="alert alert--warn">
          <strong>Customer asked for changes.</strong>
          {a.customerResponse?.comment && <> “{a.customerResponse.comment}”</>}
          <br />Update the measurements below, save, then send the new estimate.
        </div>
      )}

      <div className="split split--wide">
        <div className="stack">
          <section className="panel">
            <h2>Customer</h2>
            <dl className="facts">
              <div><dt>Mobile</dt><dd>{a.customer.mobile}</dd></div>
              <div><dt>Area</dt><dd>{areaOf(a.customer)}</dd></div>
              <div className="facts__wide"><dt>Address</dt><dd>{a.customer.address || '—'}</dd></div>
              <div><dt>Prefers</dt><dd>{a.preferredDate ? fmtDate(a.preferredDate) : 'Any day'}, {a.preferredSlot || 'any time'}</dd></div>
              <div><dt>Wants to paint</dt><dd>{urgencyLabel(a.urgency) || '—'}</dd></div>
            </dl>
            {a.crmVerification?.note && <p className="note"><strong>CRM note:</strong> {a.crmVerification.note}</p>}
            <div className="btn-row">
              <a className="btn btn--outline" href={`tel:${a.customer.mobile}`}><Phone size={16} /> Call</a>
              <a className="btn btn--outline" href={`https://wa.me/91${a.customer.mobile}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
              <a className="btn btn--outline" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a.customer.address, a.customer.district, a.customer.pincode].filter(Boolean).join(' '))}`}>
                Directions
              </a>
            </div>
          </section>

          <section className="panel">
            <h2>1. Schedule the visit</h2>
            {canSchedule ? (
              <div className="inline-form">
                <label className="field"><span>Visit date and time</span>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </label>
                <button className="btn btn--primary" disabled={!scheduledAt || busy === 'schedule'} onClick={schedule}>
                  {a.status === 'scheduled' ? 'Update visit time' : 'Schedule visit'}
                </button>
              </div>
            ) : (
              <p>Visited on {fmtDate(a.siteVisit?.visitedAt || a.scheduledAt, true)}</p>
            )}
          </section>

          <form className="panel" onSubmit={saveVisit}>
            <h2>2. Record measurements</h2>
            <MeasurementForm value={visit} onChange={setVisit} appointmentId={a._id} disabled={locked} />
            {visit.categories.length > 0 && (
              <>
                <label className="field mform__notes"><span>Site notes</span>
                  <textarea rows={3} value={visit.notes} disabled={locked} placeholder="Access, furniture, customer preferences…"
                    onChange={(e) => setVisit((v) => ({ ...v, notes: e.target.value }))} />
                </label>
                {!locked && (
                  <button className="btn btn--primary" disabled={busy === 'save'}>
                    {busy === 'save' ? 'Saving…' : a.estimate?.version ? 'Save and regenerate estimate' : 'Save and generate estimate'}
                  </button>
                )}
              </>
            )}
          </form>
        </div>

        <div className="stack stack--sticky">
          <section className="panel">
            <div className="panel__head">
              <h2>{a.estimate?.version ? `3. Average estimate (v${a.estimate.version})` : '3. Average estimate'}</h2>
              {preview && <span className="muted">Live</span>}
            </div>
            {previewError && <p className="alert alert--error">{previewError}</p>}
            {shown ? <EstimateOptions estimate={shown} /> : <p className="muted">Enter measurements to see the three options build up.</p>}

            {canSend && (
              <div className="send-box">
                <button className="btn btn--whatsapp btn--block" onClick={sendEstimate} disabled={busy === 'send'}>
                  <MessageCircle size={18} /> {a.status === 'estimate_sent' ? 'Resend on WhatsApp' : 'Send on WhatsApp'}
                </button>
                <div className="btn-row">
                  <button type="button" className="btn btn--ghost btn--small" onClick={copyLink}><Copy size={14} /> Copy link</button>
                  <a className="btn btn--ghost btn--small" href={a.shareUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Customer view</a>
                </div>
                <small className="muted">Save first if you changed measurements. The customer sees the last saved version.</small>
              </div>
            )}
            {a.status === 'approved' && (
              <div className="send-box">
                <p className="alert alert--ok">Customer chose the <strong>{a.estimate.options.find((o) => o.key === a.estimate.selectedOption)?.label}</strong> option.</p>
                <button className="btn btn--primary btn--block" onClick={complete} disabled={busy === 'complete'}>Mark job completed</button>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Activity</h2>
            <History items={a.history} />
          </section>
        </div>
      </div>
    </>
  );
}