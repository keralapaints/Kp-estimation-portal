import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import api, { errMsg } from '../api';
import Brand from '../components/Brand';
import { SLOTS } from '../constants';

const STEPS = [
  ['Book a visit', 'Share your details and pincode. We route you to the nearest Kerala Paints manager.'],
  ['We measure your home', 'Our manager checks every wall for damp, cracks and flaking, and measures each surface.'],
  ['Get your estimate on WhatsApp', 'Materials, preparation, labour and GST, itemised room by room.'],
  ['Approve or ask for changes', 'Approve in one tap, or ask for a different product range.'],
];

const initial = { name: '', email: '', mobile: '', pincode: '', address: '', preferredDate: '', preferredSlot: '', whatsappOptIn: true, consent: false };

export default function Booking() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ loading: false, error: '', refNo: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a 10-digit mobile number';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a 6-digit pincode';
    if (!form.consent) e.consent = 'Accept the terms to continue';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus({ loading: true, error: '', refNo: '' });
    try {
      const { data } = await api.post('/public/appointments', form);
      setStatus({ loading: false, error: '', refNo: data.refNo });
      setForm(initial);
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setStatus({ loading: false, error: errMsg(err), refNo: '' });
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="landing">
      <header className="landing__header">
        <Brand />
        <nav className="landing__nav">
          <Link to="/my/login" className="btn btn--outline btn--small">My bookings</Link>
          <Link to="/login" className="landing__staff">Staff login</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <h1>Know what your home will cost to paint before a single brush comes out.</h1>
            <p className="hero__lede">
              A Kerala Paints manager visits, measures every surface and sends you an itemised estimate on WhatsApp. The visit is free.
            </p>
            <ol className="steps">
              {STEPS.map(([title, text], i) => (
                <li key={title}>
                  <span className="steps__n">{i + 1}</span>
                  <div><strong>{title}</strong><p>{text}</p></div>
                </li>
              ))}
            </ol>
          </div>

          <div className="booking glass">
            {status.refNo ? (
              <div className="booking__done" role="status">
                <CheckCircle2 size={44} strokeWidth={1.6} />
                <h2>Your visit is booked</h2>
                <p>Booking reference</p>
                <p className="booking__ref">{status.refNo}</p>
                <p className="muted">Our manager will call or WhatsApp you to confirm a time. Keep this reference handy.</p>
                <div className="btn-row btn-row--center">
                  <Link className="btn btn--primary" to={`/my/login?ref=${status.refNo}`}>Track this booking</Link>
                  <button className="btn btn--outline" onClick={() => setStatus({ loading: false, error: '', refNo: '' })}>Book another visit</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2>Book a free site visit</h2>
                <Field label="Full name" error={errors.name}>
                  <input value={form.name} onChange={set('name')} autoComplete="name" />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                </Field>
                <div className="grid grid--2">
                  <Field label="Mobile number" error={errors.mobile}>
                    <input inputMode="numeric" maxLength={10} value={form.mobile} autoComplete="tel-national"
                      onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                  <Field label="Pincode" error={errors.pincode}>
                    <input inputMode="numeric" maxLength={6} value={form.pincode} autoComplete="postal-code"
                      onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                </div>
                <Field label="Address (optional)">
                  <textarea rows={2} value={form.address} onChange={set('address')} autoComplete="street-address" />
                </Field>
                <div className="grid grid--2">
                  <Field label="Preferred date">
                    <input type="date" min={today} value={form.preferredDate} onChange={set('preferredDate')} />
                  </Field>
                  <Field label="Preferred time">
                    <select value={form.preferredSlot} onChange={set('preferredSlot')}>
                      <option value="">Any time</option>
                      {SLOTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <label className="check">
                  <input type="checkbox" checked={form.whatsappOptIn} onChange={set('whatsappOptIn')} />
                  Send me updates and my estimate on WhatsApp
                </label>
                <label className={`check ${errors.consent ? 'check--error' : ''}`}>
                  <input type="checkbox" checked={form.consent} onChange={set('consent')} />
                  I agree that Kerala Paints and its partners may contact me by WhatsApp, phone, SMS and email, and I accept the terms and privacy policy.
                </label>
                {status.error && <p className="alert alert--error">{status.error}</p>}
                <button className="btn btn--primary btn--block" disabled={status.loading}>
                  {status.loading ? 'Booking…' : 'Book site visit'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="landing__footer">© {new Date().getFullYear()} Kerala Paints</footer>
    </div>
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