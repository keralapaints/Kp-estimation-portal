const { httpError } = require('./helpers');
const { CATEGORY_KEYS, byKey } = require('./categories');

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Cleans what the inspector submitted and calculates every sq ft on the server.
 * effective sq ft of a surface = length x height - (each deduction length x height x qty)
 */
function normalizeSiteVisit(input = {}) {
  const categories = [...new Set((input.categories || []).filter((c) => CATEGORY_KEYS.includes(c)))];
  if (!categories.length) throw httpError(400, 'Tick at least one work category');

  const sections = categories.map((category) => {
    const raw = (input.sections || []).find((s) => s.category === category) || { areas: [] };
    const cat = byKey(category);
    const areas = (raw.areas || []).map((a) => {
      const surfaces = (a.surfaces || []).map((s) => {
        const deductions = (s.deductions || [])
          .map((d) => ({ label: String(d.label || 'Opening').slice(0, 40), length: num(d.length), height: num(d.height), qty: Math.max(1, Math.round(num(d.qty) || 1)) }))
          .filter((d) => d.length > 0 && d.height > 0);
        const gross = num(s.length) * num(s.height);
        const minus = deductions.reduce((t, d) => t + d.length * d.height * d.qty, 0);
        return {
          type: String(s.type || 'Wall').slice(0, 40),
          length: num(s.length),
          height: num(s.height),
          deductions,
          sqft: round2(Math.max(0, gross - minus)),
          colorCode: cat.color ? String(s.colorCode || '').trim().slice(0, 40) : '',
          photos: (s.photos || []).filter((p) => /^[a-f0-9]{24}$/i.test(String(p))).slice(0, 10),
        };
      });
      return {
        room: String(a.room || '').slice(0, 60),
        name: String(a.name || '').trim().slice(0, 60),
        surfaces,
        sqft: round2(surfaces.reduce((t, s) => t + s.sqft, 0)),
      };
    });
    return { category, areas, sqft: round2(areas.reduce((t, a) => t + a.sqft, 0)) };
  });

  return { categories, sections, notes: String(input.notes || '').slice(0, 2000) };
}

/**
 * Prices the measured sq ft as the three customer options (packages).
 * rates:    RateCard docs { category, tier, rate }
 * settings: { gstRate, packages: [{ key, label, interior, exterior }] }
 */
function computeEstimate(siteVisit, rates, settings) {
  const categories = siteVisit.sections
    .filter((s) => s.sqft > 0)
    .map((s) => ({ category: s.category, label: byKey(s.category).label, sqft: s.sqft }));
  if (!categories.length) throw httpError(400, 'Enter measurements: every category has 0 sq ft');

  const options = settings.packages.map((p) => {
    const lines = categories.map((c) => {
      const cat = byKey(c.category);
      const tier = cat.tiered ? p[cat.side] : 'flat';
      const r = rates.find((x) => x.category === c.category && x.tier === tier);
      if (!r) throw httpError(400, `No rate for ${cat.label} (${tier}). Add it on the Rate card page.`);
      return { category: c.category, label: cat.label, sqft: c.sqft, tier, rate: r.rate, amount: round2(c.sqft * r.rate) };
    });
    const subtotal = round2(lines.reduce((t, l) => t + l.amount, 0));
    const gst = round2((subtotal * settings.gstRate) / 100);
    return { key: p.key, label: p.label, interior: p.interior, exterior: p.exterior, lines, subtotal, gstRate: settings.gstRate, gst, total: round2(subtotal + gst) };
  });

  return {
    categories,
    totalSqft: round2(categories.reduce((t, c) => t + c.sqft, 0)),
    options,
    selectedOption: null,
    total: Math.min(...options.map((o) => o.total)),
  };
}

module.exports = { normalizeSiteVisit, computeEstimate };
