const { httpError } = require('./helpers');

const round2 = (n) => Math.round(n * 100) / 100;
const ceilTo = (n, step) => Math.ceil(n / step) * step;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Turns site-visit measurements into a priced estimate.
 * surfaces:  [{ surfaceType, tier, label, area, coats, condition:{dampness,cracks,flaking} }]
 * rateCards: RateCard documents
 * settings:  Settings document
 */
function computeEstimate(surfaces, rateCards, settings) {
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    throw httpError(400, 'Add at least one surface to generate an estimate');
  }

  const lineItems = [];
  let totalArea = 0;

  surfaces.forEach((s, i) => {
    const area = Number(s.area);
    if (!(area > 0)) throw httpError(400, `Surface ${i + 1}: enter an area greater than 0`);

    const rc = rateCards.find((r) => r.surfaceType === s.surfaceType && r.tier === s.tier);
    if (!rc) throw httpError(400, `No rate card for ${s.surfaceType} / ${s.tier}. Add it under Rate card.`);

    totalArea += area;
    const label = (s.label || '').trim() || `${cap(s.surfaceType)} ${i + 1}`;
    const coats = Number(s.coats) || rc.defaultCoats || 2;
    const c = s.condition || {};

    const add = (category, description, qty, unit, rate) => {
      qty = round2(qty);
      lineItems.push({ surfaceLabel: label, category, description, qty, unit, rate, amount: round2(qty * rate) });
    };

    // Materials
    add('material', `${rc.productName} - ${coats} coat${coats > 1 ? 's' : ''}`, ceilTo((area * coats) / rc.paintCoverage, 0.5), 'L', rc.paintPrice);
    if (rc.primerCoverage > 0) {
      add('material', rc.primerName || 'Primer', ceilTo(area / rc.primerCoverage, 0.5), 'L', rc.primerPrice);
    }
    if (rc.puttyCoverage > 0) {
      const puttyCoats = c.cracks || c.flaking ? 2 : 1;
      add('material', `${rc.puttyName || 'Wall putty'} - ${puttyCoats} coat${puttyCoats > 1 ? 's' : ''}`, Math.ceil((area * puttyCoats) / rc.puttyCoverage), 'kg', rc.puttyPrice);
    }

    // Surface preparation based on condition
    if (c.flaking) add('prep', 'Scraping loose paint', area, 'sq ft', settings.scrapingRate);
    if (c.cracks) add('prep', 'Crack filling and sanding', area, 'sq ft', settings.crackRepairRate);
    if (c.dampness && c.dampness !== 'none') {
      add('prep', `Damp treatment (${c.dampness})`, area, 'sq ft', settings.dampTreatment[c.dampness]);
    }

    // Labour
    add('labour', 'Application labour', area, 'sq ft', rc.labourRate);
  });

  const sum = (cat) => round2(lineItems.filter((l) => l.category === cat).reduce((a, l) => a + l.amount, 0));
  const materialTotal = sum('material');
  const prepTotal = sum('prep');
  const labourTotal = sum('labour');
  const subtotal = round2(materialTotal + prepTotal + labourTotal);
  const gstRate = settings.gstRate;
  const gst = round2((subtotal * gstRate) / 100);

  return {
    lineItems,
    totalArea: round2(totalArea),
    materialTotal,
    prepTotal,
    labourTotal,
    subtotal,
    gstRate,
    gst,
    total: round2(subtotal + gst),
  };
}

module.exports = { computeEstimate };
