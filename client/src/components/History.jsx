import { fmtDate } from '../constants';

export default function History({ items = [] }) {
  if (!items.length) return <p className="muted">No activity yet.</p>;
  return (
    <ol className="history">
      {[...items].reverse().map((h, i) => (
        <li key={h._id || i}>
          <strong>{h.action}</strong>
          {h.note && <p>{h.note}</p>}
          <span>{h.byName}, {fmtDate(h.at, true)}</span>
        </li>
      ))}
    </ol>
  );
}
