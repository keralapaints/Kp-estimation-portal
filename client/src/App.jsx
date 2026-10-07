import { Routes, Route, Navigate } from 'react-router-dom';
import Booking from './pages/Booking';
import Login from './pages/Login';
import EstimateView from './pages/EstimateView';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminAppointments from './pages/admin/Appointments';
import AdminAppointmentDetail from './pages/admin/AppointmentDetail';
import Managers from './pages/admin/Managers';
import RateCard from './pages/admin/RateCard';
import MyAppointments from './pages/manager/MyAppointments';
import VisitDetail from './pages/manager/VisitDetail';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import CustomerLayout from './components/CustomerLayout';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerHome from './pages/customer/CustomerHome';
import CustomerBooking from './pages/customer/CustomerBooking';
import OpenLink from './pages/customer/OpenLink';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Booking />} />
      <Route path="/login" element={<Login />} />
      <Route path="/estimate/:token" element={<EstimateView />} />

      {/* Customer portal */}
      <Route path="/my/*" element={
        <CustomerAuthProvider>
          <Routes>
            <Route path="login" element={<CustomerLogin />} />
            <Route path="open/:token" element={<OpenLink />} />
            <Route element={<CustomerLayout />}>
              <Route index element={<CustomerHome />} />
              <Route path="bookings/:id" element={<CustomerBooking />} />
            </Route>
          </Routes>
        </CustomerAuthProvider>
      } />

      <Route path="/admin" element={<ProtectedRoute role="superadmin"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="appointments/:id" element={<AdminAppointmentDetail />} />
        <Route path="managers" element={<Managers />} />
        <Route path="rates" element={<RateCard />} />
      </Route>

      <Route path="/manager" element={<ProtectedRoute role="manager"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<MyAppointments />} />
        <Route path="appointments/:id" element={<VisitDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}