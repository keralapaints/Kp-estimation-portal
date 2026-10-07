import { STATUS } from '../constants';

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: 'muted' };
  return <span className={`badge badge--${s.tone}`}>{s.label}</span>;
}
