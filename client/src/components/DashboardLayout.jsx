import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutGrid, CalendarCheck, Users, IndianRupee, LogOut, Menu, X, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Brand from './Brand';

const NAV = {
  superadmin: [
    { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/admin/appointments', label: 'Appointments', icon: CalendarCheck },
    { to: '/admin/managers', label: 'Managers', icon: Users },
    { to: '/admin/rates', label: 'Rate card', icon: IndianRupee },
  ],
  manager: [{ to: '/manager', label: 'My site visits', icon: ClipboardList, end: true }],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`shell ${open ? 'shell--open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__top">
          <Brand light />
          <button className="icon-btn sidebar__close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="sidebar__nav">
          {NAV[user.role].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `navlink ${isActive ? 'navlink--active' : ''}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__user">
          <div>
            <strong>{user.name}</strong>
            <span>{user.role === 'superadmin' ? 'Super admin' : `Manager${user.region ? `, ${user.region}` : ''}`}</span>
          </div>
          <button className="icon-btn" onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={18} /></button>
        </div>
      </aside>
      <div className="shell__scrim" onClick={() => setOpen(false)} />
      <div className="shell__main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <Brand />
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
