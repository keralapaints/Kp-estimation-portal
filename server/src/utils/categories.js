// Work categories the field inspector can tick on site.
//  tiered: priced per range (economy / premium / luxury); otherwise one flat rate
//  side:   which side of the package decides the range (interior or exterior)
//  color:  whether a colour code is recorded for its surfaces
const CATEGORIES = [
  { key: 'interior', label: 'Interior painting', tiered: true, side: 'interior', color: true },
  { key: 'exterior', label: 'Exterior painting', tiered: true, side: 'exterior', color: true },
  { key: 'texture', label: 'Texture', tiered: true, side: 'interior', color: true },
  { key: 'putty', label: 'Putty', tiered: false, color: false },
  { key: 'waterproof', label: 'Waterproofing', tiered: true, side: 'exterior', color: true },
  { key: 'dampness', label: 'Dampness treatment', tiered: false, color: false },
  { key: 'polish_enamel', label: 'Polish & enamel', tiered: true, side: 'interior', color: true },
  { key: 'heat_reduction', label: 'Heat reduction', tiered: true, side: 'exterior', color: true },
];

const TIERS = ['economy', 'premium', 'luxury'];
const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
const byKey = (k) => CATEGORIES.find((c) => c.key === k);

// The three options shown to the customer, in order (editable on the Rate card page)
const DEFAULT_PACKAGES = [
  { key: 'luxury', label: 'Luxury', interior: 'luxury', exterior: 'luxury' },
  { key: 'premium', label: 'Premium', interior: 'premium', exterior: 'premium' },
  { key: 'economy', label: 'Economy', interior: 'economy', exterior: 'premium' },
];

module.exports = { CATEGORIES, CATEGORY_KEYS, TIERS, DEFAULT_PACKAGES, byKey };