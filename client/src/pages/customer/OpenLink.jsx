import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCustomer } from '../../context/CustomerAuthContext';
import { errMsg } from '../../api';
import Brand from '../../components/Brand';

// WhatsApp link target: logs the customer in and opens that booking
export default function OpenLink() {
  const { token } = useParams();
  const { linkLogin } = useCustomer();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    linkLogin(token)
      .then((id) => navigate(`/my/bookings/${id}`, { replace: true }))
      .catch((e) => setError(errMsg(e)));
  }, [token, linkLogin, navigate]);

  if (!error) return <div className="page-loading">Opening your estimate…</div>;
  return (
    <div className="public-msg">
      <Brand />
      <h1>We couldn't open this link</h1>
      <p>{error}</p>
      <Link className="btn btn--primary" to="/my/login">Log in to my bookings</Link>
    </div>
  );
}
