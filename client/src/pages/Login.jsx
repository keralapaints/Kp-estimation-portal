import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import Brand from '../components/Brand';
import { homeFor } from '../constants';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [state, setState] = useState({ loading: false, error: '' });

if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const u = await login(form.email, form.password);
      navigate(homeFor(u.role));
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };

  return (
    <div className="login">
      <div className="login__panel">
        <Brand />
        <h1>Staff login</h1>
        <p className="muted">Super admins and site managers sign in here.</p>
        <form onSubmit={submit}>
          <label className="field"><span>Email</span>
            <input type="email" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field"><span>Password</span>
            <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {state.error && <p className="alert alert--error">{state.error}</p>}
          <button className="btn btn--primary btn--block" disabled={state.loading}>{state.loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <Link to="/" className="login__back">Back to booking page</Link>
      </div>
      <div className="login__art" aria-hidden="true" />
    </div>
  );
}
