import { Check } from 'lucide-react';
import { inr, sqft, TIER_LABEL } from '../constants';

const rupees = (v) => inr(Math.round(v));

// Which ranges this option uses, only for the sides the estimate actually has
const rangeText = (o) => {
  const sides = [...new Set(o.lines.filter((l) => l.tier !== 'flat').map((l) => l.tier))];
  if (!sides.length) return 'Standard rates';
  if (o.interior === o.exterior) return `${TIER_LABEL[o.interior]} range`;
  return `Interior ${TIER_LABEL[o.interior]}, exterior ${TIER_LABEL[o.exterior]}`;
};

/*
  estimate: { categories, totalSqft, options, selectedOption }
  onChoose: optional (customer) - called with the option when "Choose" is clicked
*/
export default function EstimateOptions({ estimate, onChoose, busy }) {
  if (!estimate?.options?.length) return null;
  const chosen = estimate.selectedOption;

  return (
    <div className="est">
      <div className="table-wrap">
        <table className="table est__area">
          <thead><tr><th>Work</th><th className="num">Area</th></tr></thead>
          <tbody>
            {estimate.categories.map((c) => (
              <tr key={c.category}><td>{c.label}</td><td className="num">{sqft(c.sqft)}</td></tr>
            ))}
            <tr className="est__sum"><td>Total area</td><td className="num">{sqft(estimate.totalSqft)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="est__options">
        {estimate.options.map((o, i) => (
          <article key={o.key} className={`opt ${chosen === o.key ? 'opt--chosen' : ''} ${chosen && chosen !== o.key ? 'opt--dim' : ''}`}>
            <header>
              <span className="opt__n">Option {i + 1}</span>
              <h3>{o.label}</h3>
              <p>{rangeText(o)}</p>
            </header>
            <div className="opt__price">
              <strong>{rupees(o.total)}</strong>
              <span>incl. {o.gstRate}% GST</span>
            </div>
            <dl className="opt__lines">
              {o.lines.map((l) => (
                <div key={l.category}>
                  <dt>{l.label}<small>{sqft(l.sqft)} × {inr(l.rate)}{l.tier !== 'flat' ? `, ${TIER_LABEL[l.tier]}` : ''}</small></dt>
                  <dd>{rupees(l.amount)}</dd>
                </div>
              ))}
              <div className="opt__sub"><dt>Subtotal</dt><dd>{rupees(o.subtotal)}</dd></div>
              <div className="opt__sub"><dt>GST {o.gstRate}%</dt><dd>{rupees(o.gst)}</dd></div>
            </dl>
            {chosen === o.key && <p className="opt__chosen"><Check size={16} /> Chosen</p>}
            {onChoose && !chosen && (
              <button type="button" className={`btn btn--block ${i === 0 ? 'btn--primary' : 'btn--outline'}`} disabled={busy} onClick={() => onChoose(o)}>
                Choose {o.label}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}