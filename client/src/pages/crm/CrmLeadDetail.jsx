import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import api, { errMsg } from '../../api';
import { SLOTS, DISTRICTS, URGENCY, fmtDate } from '../../constants';
import StatusBadge from '../../components/StatusBadge';
import History from '../../components/History';

const EDITABLE = ['crm_assigned', 'awaiting_inspection', 'invalid'];
const toForm = (a) => ({
  name: a.customer.name, mobile: a.customer.mobile, email: a.customer.email || '',
  district: a.customer.district || '', pincode: a.customer.pincode || '', address: a.customer.address || '',
  urgency: a.urgency || '', preferredDate: a.preferredDate ? a.preferredDate.slice(0, 10) : '', preferredSlot: a.preferredSlot || '',
});

export default function CrmLeadDetail() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [verify, setVerify] = useState({ result: '', note: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const hydrate = (data) => {
    setA(data);
    setForm(toForm(data));
    setVerify({ result: data.crmVerification?.result || '', note: data.crmVerification?.note || '' });
  };

  useEffect(() => {
    api.get(`/crm/appointments/${id}`).then((r) => hydrate(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const saveDetails = async (e) => {
    e.preventDefault();
    setBusy('save'); setErrors({}); setMsg({ type: '', text: '' });
    try {
      const { data } = await api.put(`/crm/appointments/${id}/customer`, form);
      hydrate(data);
      setMsg({ type: 'ok', text: 'Customer details saved' });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setMsg({ type: 'error', text: errMsg(err) });
    } finally { setBusy(''); }
  };

  const submitVerify = async () => {
    if (!verify.result) return setMsg({ type: 'error', text: 'Choose a site visit status' });
    setBusy('verify'); setMsg({ type: '', text: '' });
    try {
      const { data } = await api.patch(`/crm/appointments/${id}/verify`, verify);
      hydrate(data);
      setMsg({ type: 'ok', text: verify.result === 'waiting_inspection' ? 'Sent to the project manager for inspection' : 'Lead marked wrong' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    } finally { setBusy(''); }
  };

  if (!a) return msg.text ? <p className="alert alert--error">{msg.text}</p> : <div className="page-loading">Loading…</div>;
  const editable = EDITABLE.includes(a.status);

  return (
    <>
      <Link to="/crm" className="back"><ArrowLeft size={16} /> My leads</Link>
      <div className="page-head">
        <div><h1>{a.customer.name}</h1><p className="muted">{a.refNo}, booked {fmtDate(a.createdAt, true)}</p></div>
        <StatusBadge status={a.status} />
      </div>
      {msg.text && <p className={`alert alert--${msg.type === 'ok' ? 'ok' : 'error'}`} role="status">{msg.text}</p>}
      {!editable && (
        <p className="alert alert--info">
          {a.assignedTo ? `Field inspector ${a.assignedTo.name} is handling this lead.` : 'This lead has moved on.'} Details are now locked.
        </p>
      )}

      <div className="split">
        <div className="stack">
          <form className="panel" onSubmit={saveDetails}>
            <div className="panel__head">
              <h2>1. Call and check details</h2>
              <div className="btn-row">
                <a className="btn btn--small btn--outline" href={`tel:${a.customer.mobile}`}><Phone size={14} /> Call {a.customer.mobile}</a>
                <a className="btn btn--small btn--outline" href={`https://wa.me/91${a.customer.mobile}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              </div>
            </div>
            <fieldset className="plain" disabled={!editable}>
                           <div className="grid grid--2">
                <Field label="Customer name *" error={errors.name}><input value={form.name} onChange={set('name')} /></Field>
                <Field label="Phone number *" error={errors.mobile}>
                  <input inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
                </Field>
                <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set('email')} /></Field>
                <Field label="Painting urgency" error={errors.urgency}>
                  <select value={form.urgency} onChange={set('urgency')}>
                    <option value="">Not given</option>
                    {URGENCY.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </Field>
                <Field label="District" error={errors.district}>
                  <select value={form.district} onChange={set('district')}>
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Pincode" error={errors.pincode}>
                  <input inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} />
                </Field>
              </div>
              <Field label="Site address">
                <textarea rows={2} value={form.address} placeholder="Ask the customer for the full site address and landmark" onChange={set('address')} />
              </Field>
              <div className="grid grid--2">
                <Field label="Preferred field visit date"><input type="date" value={form.preferredDate} onChange={set('preferredDate')} /></Field>
                <Field label="Preferred field visit time">
                  <select value={form.preferredSlot} onChange={set('preferredSlot')}>
                    <option value="">Any time</option>
                    {SLOTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              {editable && <button className="btn btn--outline" disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save corrected details'}</button>}
            </fieldset>
          </form>

          <section className="panel verify-panel">
            <h2>2. Is this a genuine site visit?</h2>
            <fieldset className="plain" disabled={!editable}>
              <label className="field"><span>Site visit status</span>
                <select value={verify.result} onChange={(e) => setVerify({ ...verify, result: e.target.value })}>
                  <option value="">Choose…</option>
                  <option value="waiting_inspection">Waiting for site inspection</option>
                  <option value="wrong">Wrong</option>
                </select>
                <small>
                  {verify.result === 'waiting_inspection' && 'The lead goes to the project manager, who assigns a field inspector.'}
                  {verify.result === 'wrong' && 'The lead is closed. The team lead can reopen it if needed.'}
                </small>
              </label>
              <label className="field"><span>{verify.result === 'wrong' ? 'Reason (required)' : 'Note for the project manager (optional)'}</span>
                <textarea rows={3} value={verify.note} placeholder={verify.result === 'wrong' ? 'e.g. Number not reachable, customer did not book, duplicate' : 'e.g. 2BHK, customer available after 4pm'}
                  onChange={(e) => setVerify({ ...verify, note: e.target.value })} />
              </label>
              {editable && (
                <button type="button" className="btn btn--primary" disabled={busy === 'verify'} onClick={submitVerify}>
                  {busy === 'verify' ? 'Saving…' : 'Submit'}
                </button>
              )}
            </fieldset>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2>Activity</h2>
            <History items={a.history} />
          </section>
        </div>
      </div>
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <label className={`field ${error ? 'field--error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}