import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import api, { errMsg } from '../api';
import Brand from '../components/Brand';
import { SLOTS, DISTRICTS, URGENCY } from '../constants';

const STEPS = [
  ['Book a visit', 'Share your name and phone number. Our team calls you to confirm the details.'],
  ['We inspect your home', 'A Kerala Paints field inspector checks every wall for damp, cracks and flaking, and measures each surface.'],
  ['Get your estimate on WhatsApp', 'Materials, preparation, labour and GST, itemised room by room.'],
  ['Approve or ask for changes', 'Approve in one tap, or ask for a different product range.'],
];

const initial = { name: '', mobile: '', email: '', district: '', pincode: '', urgency: '', preferredDate: '', preferredSlot: '' };

export default function Booking() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ loading: false, error: '', refNo: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a 10-digit mobile number';
    // Optional fields: only checked when filled in
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a 6-digit pincode';
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
              A Kerala Paints field inspector visits, measures every surface and sends you an itemised estimate on WhatsApp. The visit is free.
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
                <p className="muted">Our team will call you shortly to confirm your details. Keep this reference handy.</p>
                <div className="btn-row btn-row--center">
                  <Link className="btn btn--primary" to={`/my/login?ref=${status.refNo}`}>Track this booking</Link>
                  <button className="btn btn--outline" onClick={() => setStatus({ loading: false, error: '', refNo: '' })}>Book another visit</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2>Book a free site visit</h2>
                <Field label="Name" required error={errors.name}>
                  <input value={form.name} onChange={set('name')} autoComplete="name" />
                </Field>
                <div className="grid grid--2">
                  <Field label="Phone number" required error={errors.mobile}>
                    <input type="tel" inputMode="numeric" maxLength={10} value={form.mobile} autoComplete="tel-national"
                      onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                  </Field>
                </div>
                <div className="grid grid--2">
                  <Field label="District" error={errors.district}>
                    <select value={form.district} onChange={set('district')}>
                      <option value="">Select district</option>
                      {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Pincode" error={errors.pincode}>
                    <input inputMode="numeric" maxLength={6} value={form.pincode} autoComplete="postal-code"
                      onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                </div>
                <Field label="Painting urgency" error={errors.urgency}>
                  <select value={form.urgency} onChange={set('urgency')}>
                    <option value="">When do you plan to paint?</option>
                    {URGENCY.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </Field>
                <div className="grid grid--2">
                  <Field label="Preferred field visit date">
                    <input type="date" min={today} value={form.preferredDate} onChange={set('preferredDate')} />
                  </Field>
                  <Field label="Preferred field visit time">
                    <select value={form.preferredSlot} onChange={set('preferredSlot')}>
                      <option value="">Any time</option>
                      {SLOTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                {status.error && <p className="alert alert--error">{status.error}</p>}
                <button className="btn btn--primary btn--block" disabled={status.loading}>
                  {status.loading ? 'Booking…' : 'Book site visit'}
                </button>
                <p className="booking__terms">By booking, you agree that Kerala Paints may contact you by phone or WhatsApp about this visit.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="landing__footer">© {new Date().getFullYear()} Kerala Paints</footer>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className={`field ${error ? 'field--error' : ''}`}>
      <span>{label}{required && <b className="req" aria-hidden="true"> *</b>}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}