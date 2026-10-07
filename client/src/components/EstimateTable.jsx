import { inr } from '../constants';

// Groups line items by surface and shows totals
export default function EstimateTable({ estimate, compact = false }) {
  if (!estimate?.lineItems?.length) return null;
  const groups = estimate.lineItems.reduce((acc, li) => {
    (acc[li.surfaceLabel] ||= []).push(li);
    return acc;
  }, {});

  return (
    <div className="estimate">
      <div className="table-wrap">
        <table className="table table--estimate">
          <thead>
            <tr><th>Item</th><th className="num">Qty</th>{!compact && <th className="num col-rate">Rate</th>}<th className="num">Amount</th></tr>
          </thead>
          {Object.entries(groups).map(([label, items]) => (
            <tbody key={label}>
              <tr className="table__group"><td colSpan={4}>{label}</td></tr>
              {items.map((li, i) => (
                <tr key={i}>
                  <td><span className={`dot dot--${li.category}`} aria-hidden="true" />{li.description}</td>
                  <td className="num">{li.qty} {li.unit}</td>
                  {!compact && <td className="num col-rate">{inr(li.rate)}</td>}
                  <td className="num">{inr(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <dl className="totals">
        <div><dt>Materials</dt><dd>{inr(estimate.materialTotal)}</dd></div>
        <div><dt>Surface preparation</dt><dd>{inr(estimate.prepTotal)}</dd></div>
        <div><dt>Labour</dt><dd>{inr(estimate.labourTotal)}</dd></div>
        <div><dt>Subtotal</dt><dd>{inr(estimate.subtotal)}</dd></div>
        <div><dt>GST ({estimate.gstRate}%)</dt><dd>{inr(estimate.gst)}</dd></div>
        <div className="totals__grand"><dt>Total</dt><dd>{inr(estimate.total)}</dd></div>
      </dl>
    </div>
  );
}