import { Plus, Trash2 } from 'lucide-react';
import { SURFACE_TYPES, TIERS } from '../constants';

export const blankSurface = () => ({
  key: Math.random().toString(36).slice(2),
  surfaceType: 'interior', label: '', length: '', height: '', area: '',
  tier: 'premium', coats: 2,
  condition: { dampness: 'none', cracks: false, flaking: false },
});

export default function SurfaceEditor({ surfaces, onChange, disabled }) {
  const update = (i, patch) => {
    const next = surfaces.map((s, idx) => {
      if (idx !== i) return s;
      const merged = { ...s, ...patch, condition: { ...s.condition, ...(patch.condition || {}) } };
      // Length x height fills the area automatically
      if (('length' in patch || 'height' in patch) && Number(merged.length) > 0 && Number(merged.height) > 0) {
        merged.area = +(Number(merged.length) * Number(merged.height)).toFixed(2);
      }
      return merged;
    });
    onChange(next);
  };

  return (
    <div className="surfaces">
      {surfaces.map((s, i) => (
        <fieldset key={s.key || s._id || i} className="surface" disabled={disabled}>
          <legend>Surface {i + 1}</legend>
          <div className="grid grid--4">
            <label className="field">
              <span>Type</span>
              <select value={s.surfaceType} onChange={(e) => update(i, { surfaceType: e.target.value })}>
                {SURFACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="field field--span2">
              <span>Where</span>
              <input value={s.label} placeholder="e.g. Living room walls" onChange={(e) => update(i, { label: e.target.value })} />
            </label>
            <label className="field">
              <span>Product range</span>
              <select value={s.tier} onChange={(e) => update(i, { tier: e.target.value })}>
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid--4">
            <label className="field">
              <span>Length (ft)</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" value={s.length ?? ''} onChange={(e) => update(i, { length: e.target.value })} />
            </label>
            <label className="field">
              <span>Height (ft)</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" value={s.height ?? ''} onChange={(e) => update(i, { height: e.target.value })} />
            </label>
            <label className="field">
              <span>Area (sq ft)</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" required value={s.area} onChange={(e) => update(i, { area: e.target.value })} />
            </label>
            <label className="field">
              <span>Coats</span>
              <input type="number" min="1" max="5" value={s.coats} onChange={(e) => update(i, { coats: e.target.value })} />
            </label>
          </div>
          <div className="surface__condition">
            <label className="field field--inline">
              <span>Dampness</span>
              <select value={s.condition.dampness} onChange={(e) => update(i, { condition: { dampness: e.target.value } })}>
                <option value="none">None</option><option value="low">Low</option>
                <option value="medium">Medium</option><option value="high">High</option>
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={s.condition.cracks} onChange={(e) => update(i, { condition: { cracks: e.target.checked } })} /> Cracks</label>
            <label className="check"><input type="checkbox" checked={s.condition.flaking} onChange={(e) => update(i, { condition: { flaking: e.target.checked } })} /> Flaking paint</label>
            {surfaces.length > 1 && (
              <button type="button" className="btn btn--ghost btn--danger surface__remove" onClick={() => onChange(surfaces.filter((_, idx) => idx !== i))}>
                <Trash2 size={16} /> Remove
              </button>
            )}
          </div>
        </fieldset>
      ))}
      {!disabled && (
        <button type="button" className="btn btn--outline" onClick={() => onChange([...surfaces, blankSurface()])}>
          <Plus size={16} /> Add surface
        </button>
      )}
    </div>
  );
}
