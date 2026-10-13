import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import customerApi from '../../customerApi';
import { errMsg } from '../../api';
import { useCustomer } from '../../context/CustomerAuthContext';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate, inr } from '../../constants';

const nextStep = (a) => ({
    new: 'We have received your booking.',
  crm_assigned: 'Our team will call you shortly to confirm your details.',
  awaiting_inspection: 'Details confirmed. We are assigning an inspector for your area.',
  invalid: 'This booking was closed. Call us or book again if you still need a visit.',
  assigned: `${a.manager?.name || 'Your inspector'} will call you to fix a visit time.`,
  scheduled: `Site visit on ${fmtDate(a.scheduledAt, true)}.`,
  visited: 'Your manager is preparing the estimate.',
  estimate_sent: 'Your estimate is ready. Choose one of the three options.',
  revision_requested: 'We are updating the estimate with your changes.',
  approved: 'Estimate approved. Your manager will schedule the work.',
  completed: 'Work completed. Thank you for choosing Kerala Paints.',
  cancelled: 'This booking was cancelled.',
}[a.status]);

export default function CustomerHome() {
  const { customer } = useCustomer();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    customerApi.get('/appointments').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!items) return <div className="page-loading">Loading your bookings…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hello, {customer.name.split(' ')[0]}</h1>
          <p className="muted">{items.length} booking{items.length === 1 ? '' : 's'} on {customer.mobile}</p>
        </div>
        <Link to="/" className="btn btn--outline">Book another visit</Link>
      </div>

      <div className="booking-list">
        {items.map((a) => (
          <Link key={a._id} to={`/my/bookings/${a._id}`} className={`booking-card ${a.status === 'estimate_sent' ? 'booking-card--action' : ''}`}>
            <div className="booking-card__main">
              <div className="booking-card__top">
                <strong>{a.refNo}</strong>
                <StatusBadge status={a.status} />
              </div>
              <p>{nextStep(a)}</p>
              <span className="muted">Booked {fmtDate(a.createdAt)}{a.customer.pincode ? `, pincode ${a.customer.pincode}` : ''}</span>
            </div>
            {a.estimate?.total > 0 && (
              <div className="booking-card__total">
                                <span>{a.estimate.selectedOption ? 'Approved' : 'From'}</span>
                <strong>{inr(Math.round(a.estimate.total))}</strong>
              </div>
            )}
            <ChevronRight className="booking-card__chev" size={20} />
          </Link>
        ))}
      </div>
    </>
  );
}