import { Navigate, useParams } from 'react-router-dom';

// Links sent before the customer portal existed still work
export default function EstimateView() {
  const { token } = useParams();
  return <Navigate to={`/my/open/${token}`} replace />;
}
