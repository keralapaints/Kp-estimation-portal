import { photoUrl } from '../api';
import { categoryOf, sqft } from '../constants';

// Read-only view of what the field inspector measured
export default function MeasurementSummary({ siteVisit }) {
  const sections = siteVisit?.sections || [];
  if (!sections.length) return <p className="muted">No measurements yet.</p>;

  return (
    <div className="msum">
      {sections.map((sec) => (
        <div key={sec.category} className="msum__sec">
          <h3>{categoryOf(sec.category).label} <span>{sqft(sec.sqft)}</span></h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Area</th><th>Surface</th><th className="num">Size (ft)</th><th>Minus</th><th className="num">Sq ft</th><th>Colour</th><th>Photos</th></tr></thead>
              <tbody>
                {sec.areas.flatMap((a, ai) => a.surfaces.map((s, si) => (
                  <tr key={`${ai}-${si}`}>
                    <td>{si === 0 ? <strong>{[a.room, a.name].filter(Boolean).join(', ') || `Area ${ai + 1}`}</strong> : ''}</td>
                    <td>{s.type}</td>
                    <td className="num">{s.length} × {s.height}</td>
                    <td className="msum__ded">{s.deductions?.length ? s.deductions.map((d) => `${d.label} ${d.length}×${d.height}${d.qty > 1 ? ` ×${d.qty}` : ''}`).join(', ') : '—'}</td>
                    <td className="num">{s.sqft}</td>
                    <td>{s.colorCode || '—'}</td>
                    <td>
                      <div className="msum__photos">
                        {(s.photos || []).map((id) => (
                          <a key={id} href={photoUrl(id)} target="_blank" rel="noreferrer"><img src={photoUrl(id)} alt="Site" /></a>
                        ))}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {siteVisit.notes && <p className="note"><strong>Inspector notes:</strong> {siteVisit.notes}</p>}
    </div>
  );
}