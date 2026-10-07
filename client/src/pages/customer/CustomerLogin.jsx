import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomer } from '../../context/CustomerAuthContext';
import { errMsg } from '../../api';
import Brand from '../../components/Brand';

export default function CustomerLogin() {
  const { customer, login } = useCustomer();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ mobile: '', refNo: params.get('ref') || '' });
  const [state, setState] = useState({ busy: false, error: '' });

  if (customer) return <Navigate to="/my" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return setState({ busy: false, error: 'Enter the 10-digit mobile number you booked with' });
    if (!form.refNo.trim()) return setState({ busy: false, error: 'Enter your booking reference' });
    setState({ busy: true, error: '' });
    try {
      await login(form.mobile, form.refNo);
      navigate('/my');
    } catch (err) {
      setState({ busy: false, error: errMsg(err) });
    }
  };

  return (
    <div className="login">
      <div className="login__panel">
        <Brand />
        <h1>My bookings</h1>
        <p className="muted">Track your site visit, see your estimate and approve it.</p>
        <form onSubmit={submit}>
          <label className="field"><span>Mobile number</span>
            <input inputMode="numeric" maxLength={10} autoComplete="tel-national" value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
          </label>
          <label className="field"><span>Booking reference</span>
            <input value={form.refNo} placeholder="e.g. KP2609302907" autoCapitalize="characters"
              onChange={(e) => setForm({ ...form, refNo: e.target.value.toUpperCase() })} />
            <small>It was shown after you booked and is in our WhatsApp messages.</small>
          </label>
          {state.error && <p className="alert alert--error">{state.error}</p>}
          <button className="btn btn--primary btn--block" disabled={state.busy}>{state.busy ? 'Checking…' : 'See my bookings'}</button>
        </form>
        <Link to="/" className="login__back">Book a new site visit</Link>
      </div>
      <div className="login__art" aria-hidden="true" />
    </div>
  );
}