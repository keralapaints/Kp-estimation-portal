import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useCustomer } from '../context/CustomerAuthContext';
import Brand from './Brand';

export default function CustomerLayout() {
  const { customer, loading, logout } = useCustomer();
  const navigate = useNavigate();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!customer) return <Navigate to="/my/login" replace />;

  return (
    <div className="portal">
      <header className="portal__header">
        <Link to="/my" className="portal__brand"><Brand /></Link>
        <div className="portal__who">
          <span>{customer.name}</span>
          <button className="btn btn--ghost btn--small" onClick={() => { logout(); navigate('/my/login'); }}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>
      <main className="portal__main"><Outlet /></main>
      <footer className="landing__footer">© {new Date().getFullYear()} Kerala Paints</footer>
    </div>
  );
}