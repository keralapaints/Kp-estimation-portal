import { useState } from 'react';
import { Plus, Trash2, Camera, X, Pencil } from 'lucide-react';
import api, { errMsg, photoUrl } from '../api';
import { compressImage } from '../utils/image';
import {
  CATEGORIES, categoryOf, roomsFor, SURFACE_KINDS, FLAT_SURFACES, DEDUCTION_LABELS, DEFAULT_SURFACES, sqft,
} from '../constants';

const uid = () => Math.random().toString(36).slice(2, 10);
const n = (v) => (Number(v) > 0 ? Number(v) : 0);
const r2 = (x) => Math.round(x * 100) / 100;

export const newDeduction = () => ({ key: uid(), label: 'Door', length: '', height: '', qty: 1 });
export const newSurface = (type = 'Wall') => ({ key: uid(), type, length: '', height: '', deductions: [], colorCode: '', photos: [] });
export const newArea = (category) => ({ key: uid(), room: '', name: '', surfaces: (DEFAULT_SURFACES[category] || ['Wall']).map(newSurface) });

// Same maths as the server: length x height - every deduction (length x height x qty)
export const surfaceSqft = (s) =>
  r2(Math.max(0, n(s.length) * n(s.height) - (s.deductions || []).reduce((t, d) => t + n(d.length) * n(d.height) * Math.max(1, n(d.qty) || 1), 0)));
export const areaSqft = (a) => r2(a.surfaces.reduce((t, s) => t + surfaceSqft(s), 0));
export const sectionSqft = (sec) => r2(sec.areas.reduce((t, a) => t + areaSqft(a), 0));

// Adds React keys to data that came from the server
export const withKeys = (siteVisit) => ({
  categories: siteVisit?.categories || [],
  notes: siteVisit?.notes || '',
  sections: (siteVisit?.sections || []).map((sec) => ({
    ...sec,
    areas: sec.areas.map((a) => ({
      ...a, key: uid(),
      surfaces: a.surfaces.map((s) => ({ ...s, key: uid(), photos: (s.photos || []).map(String), deductions: (s.deductions || []).map((d) => ({ ...d, key: uid() })) })),
    })),
  })),
});

// value:    { categories, sections, notes }
// onChange: a React state setter (accepts a value or an updater function)
export default function MeasurementForm({ value, onChange, appointmentId, disabled }) {
  const [picking, setPicking] = useState(!value.categories.length);
  const [picked, setPicked] = useState(value.categories);
  const [pickError, setPickError] = useState('');

  const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  // "Submit" on the category checkboxes: builds a section for each ticked category
  const applyCategories = () => {
    if (!picked.length) return setPickError('Tick at least one category');
    const dropped = value.sections.filter((s) => !picked.includes(s.category) && sectionSqft(s) > 0);
    if (dropped.length && !window.confirm(`Remove ${dropped.map((s) => categoryOf(s.category).label).join(', ')} and its measurements?`)) return;
    const categories = CATEGORIES.map((c) => c.key).filter((k) => picked.includes(k));
    const sections = categories.map((k) => value.sections.find((s) => s.category === k) || { category: k, areas: [newArea(k)] });
    onChange({ ...value, categories, sections });
    setPickError('');
    setPicking(false);
  };

  // onChange is a React state setter, so updates are applied to the latest state (safe during photo uploads)
  const setSection = (cat, fn) =>
    onChange((v) => ({ ...v, sections: v.sections.map((s) => (s.category === cat ? fn(s) : s)) }));
  const setArea = (cat, ai, fn) => setSection(cat, (s) => ({ ...s, areas: s.areas.map((a, i) => (i === ai ? fn(a) : a)) }));
  const setSurface = (cat, ai, si, fn) => setArea(cat, ai, (a) => ({ ...a, surfaces: a.surfaces.map((x, i) => (i === si ? fn(x) : x)) }));

  if (picking) {
    return (
      <div className="mcats">
        <p className="muted">Tick every type of work this site needs, then continue.</p>
        <div className="mcats__grid">
          {CATEGORIES.map((c) => (
            <label key={c.key} className={`mcat ${picked.includes(c.key) ? 'mcat--on' : ''}`}>
              <input type="checkbox" checked={picked.includes(c.key)} onChange={() => toggle(c.key)} disabled={disabled} />
              {c.label}
            </label>
          ))}
        </div>
        {pickError && <p className="alert alert--error">{pickError}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={applyCategories} disabled={disabled}>Continue</button>
          {value.categories.length > 0 && <button type="button" className="btn btn--ghost" onClick={() => { setPicked(value.categories); setPicking(false); }}>Cancel</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="mform">
      <div className="mform__cats">
        {value.categories.map((k) => <span key={k} className="chip">{categoryOf(k).label}</span>)}
        {!disabled && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => { setPicked(value.categories); setPicking(true); }}>
            <Pencil size={14} /> Change categories
          </button>
        )}
      </div>

      {value.sections.map((sec) => {
        const cat = categoryOf(sec.category);
        return (
          <section key={sec.category} className="msec">
            <header className="msec__head">
              <h3>{cat.label}</h3>
              <span className="msec__total">{sqft(sectionSqft(sec))}</span>
            </header>

            {sec.areas.map((area, ai) => (
              <div key={area.key} className="marea">
                <div className="marea__head">
                  <select value={area.room} disabled={disabled} aria-label="Area"
                    onChange={(e) => setArea(sec.category, ai, (a) => ({ ...a, room: e.target.value }))}>
                    <option value="">Select area</option>
                    {roomsFor(sec.category).map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <input value={area.name} placeholder="Name (optional), e.g. Bedroom 2" disabled={disabled} aria-label="Area name"
                    onChange={(e) => setArea(sec.category, ai, (a) => ({ ...a, name: e.target.value }))} />
                  <strong className="marea__total">{sqft(areaSqft(area))}</strong>
                  {!disabled && (
                    <button type="button" className="icon-btn icon-btn--danger" aria-label="Remove area"
                      onClick={() => setSection(sec.category, (s) => ({ ...s, areas: s.areas.filter((_, i) => i !== ai) }))}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {area.surfaces.map((surf, si) => (
                  <SurfaceEditor key={surf.key} surface={surf} showColor={cat.color} disabled={disabled} appointmentId={appointmentId}
                    onChange={(fn) => setSurface(sec.category, ai, si, fn)}
                    onRemove={() => setArea(sec.category, ai, (a) => ({ ...a, surfaces: a.surfaces.filter((_, i) => i !== si) }))} />
                ))}

                {!disabled && (
                  <button type="button" className="btn btn--ghost btn--small"
                    onClick={() => setArea(sec.category, ai, (a) => ({
                      ...a,
                      surfaces: [...a.surfaces, newSurface(a.surfaces.some((s) => s.type === 'Ceiling') || sec.category !== 'interior' ? 'Wall' : 'Ceiling')],
                    }))}>
                    <Plus size={14} /> Add surface
                  </button>
                )}
              </div>
            ))}

            {!disabled && (
              <button type="button" className="btn btn--outline btn--small"
                onClick={() => setSection(sec.category, (s) => ({ ...s, areas: [...s.areas, newArea(sec.category)] }))}>
                <Plus size={14} /> Add {cat.side === 'exterior' ? 'area' : 'room'}
              </button>
            )}
          </section>
        );
      })}

      <div className="mtotals">
        {value.sections.map((sec) => (
          <div key={sec.category}><span>{categoryOf(sec.category).label}</span><strong>{sqft(sectionSqft(sec))}</strong></div>
        ))}
      </div>
    </div>
  );
}

function SurfaceEditor({ surface: s, showColor, disabled, appointmentId, onChange, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const set = (patch) => onChange((x) => ({ ...x, ...patch }));
  const setDed = (di, patch) => onChange((x) => ({ ...x, deductions: x.deductions.map((d, i) => (i === di ? { ...d, ...patch } : d)) }));
  const flat = FLAT_SURFACES.includes(s.type);
  const gross = r2(n(s.length) * n(s.height));

  const upload = async (files) => {
    setPhotoError('');
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await compressImage(file);
        const { data } = await api.post('/photos', { appointmentId, dataUrl });
        onChange((x) => ({ ...x, photos: [...x.photos, String(data.id)] }));
      }
    } catch (e) {
      setPhotoError(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <fieldset className="msurf" disabled={disabled}>
      <div className="msurf__main">
        <label className="field field--tight"><span>Surface</span>
          <select value={s.type} onChange={(e) => set({ type: e.target.value })}>
            {SURFACE_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="field field--tight"><span>Length (ft)</span>
          <input type="number" inputMode="decimal" min="0" step="0.1" value={s.length} onChange={(e) => set({ length: e.target.value })} />
        </label>
        <label className="field field--tight"><span>{flat ? 'Width (ft)' : 'Height (ft)'}</span>
          <input type="number" inputMode="decimal" min="0" step="0.1" value={s.height} onChange={(e) => set({ height: e.target.value })} />
        </label>
        <div className="msurf__gross"><span>Gross</span><strong>{sqft(gross)}</strong></div>
        <button type="button" className="icon-btn icon-btn--danger msurf__remove" aria-label="Remove surface" onClick={onRemove}><Trash2 size={16} /></button>
      </div>

      {s.deductions.length > 0 && (
        <div className="mded">
          <span className="mded__title">Minus (doors, windows…)</span>
          {s.deductions.map((d, di) => (
            <div key={d.key} className="mded__row">
              <select value={d.label} aria-label="Opening" onChange={(e) => setDed(di, { label: e.target.value })}>
                {DEDUCTION_LABELS.map((l) => <option key={l}>{l}</option>)}
              </select>
              <input type="number" inputMode="decimal" min="0" step="0.1" placeholder="L" aria-label="Length (ft)" value={d.length} onChange={(e) => setDed(di, { length: e.target.value })} />
              <span>×</span>
              <input type="number" inputMode="decimal" min="0" step="0.1" placeholder="H" aria-label="Height (ft)" value={d.height} onChange={(e) => setDed(di, { height: e.target.value })} />
              <span>×</span>
              <input type="number" inputMode="numeric" min="1" step="1" aria-label="Quantity" value={d.qty} onChange={(e) => setDed(di, { qty: e.target.value })} />
              <span className="mded__minus">−{r2(n(d.length) * n(d.height) * Math.max(1, n(d.qty) || 1))}</span>
              <button type="button" className="icon-btn" aria-label="Remove" onClick={() => onChange((x) => ({ ...x, deductions: x.deductions.filter((_, i) => i !== di) }))}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn btn--ghost btn--small" onClick={() => onChange((x) => ({ ...x, deductions: [...x.deductions, newDeduction()] }))}>
        <Plus size={14} /> Minus door / window
      </button>

      <div className="msurf__foot">
        <div className="msurf__eff"><span>Effective</span><strong>{sqft(surfaceSqft(s))}</strong></div>
        {showColor && (
          <label className="field field--tight msurf__color"><span>Colour code</span>
            <input value={s.colorCode} placeholder="e.g. KP 7012" onChange={(e) => set({ colorCode: e.target.value })} />
          </label>
        )}
        <div className="msurf__photos">
          {s.photos.map((id) => (
            <span key={id} className="thumb">
              <a href={photoUrl(id)} target="_blank" rel="noreferrer"><img src={photoUrl(id)} alt="Site" /></a>
              {!disabled && <button type="button" aria-label="Remove photo" onClick={() => onChange((x) => ({ ...x, photos: x.photos.filter((p) => p !== id) }))}><X size={12} /></button>}
            </span>
          ))}
          {!disabled && (
            <label className={`btn btn--outline btn--small ${uploading ? 'is-busy' : ''}`}>
              <Camera size={14} /> {uploading ? 'Uploading…' : 'Photo'}
              <input type="file" accept="image/*" multiple hidden disabled={uploading}
                onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
            </label>
          )}
        </div>
      </div>
      {photoError && <p className="alert alert--error">{photoError}</p>}
    </fieldset>
  );
}