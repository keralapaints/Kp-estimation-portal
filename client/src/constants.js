export const STATUS = {
  new: { label: 'New lead', tone: 'turmeric' },
  crm_assigned: { label: 'Verifying details', tone: 'sky' },
  awaiting_inspection: { label: 'Awaiting inspection', tone: 'turmeric' },
  invalid: { label: 'Wrong lead', tone: 'muted' },
  assigned: { label: 'Inspector assigned', tone: 'sky' },
  scheduled: { label: 'Visit scheduled', tone: 'sky' },
  visited: { label: 'Estimate ready', tone: 'violet' },
  estimate_sent: { label: 'Estimate sent', tone: 'violet' },
  revision_requested: { label: 'Changes requested', tone: 'laterite' },
  approved: { label: 'Approved', tone: 'leaf' },
  completed: { label: 'Completed', tone: 'ink' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

// Order of the job pipeline (used on the dashboard)
export const PIPELINE = ['new', 'crm_assigned', 'awaiting_inspection', 'assigned', 'scheduled', 'visited', 'estimate_sent', 'revision_requested', 'approved', 'completed'];

// Staff roles. 'manager' is the field inspector (kept as 'manager' so existing accounts keep working)
export const ROLES = {
  superadmin: 'Team lead',
  crm: 'CRM',
  project_manager: 'Project manager',
  manager: 'Field inspector',
};

// Where each role lands after login
export const homeFor = (role) => ({ superadmin: '/admin', crm: '/crm', project_manager: '/pm', manager: '/manager' }[role] || '/login');

export const SURFACE_TYPES = [
  { value: 'interior', label: 'Interior walls' },
  { value: 'exterior', label: 'Exterior walls' },
  { value: 'waterproofing', label: 'Waterproofing' },
  { value: 'wood', label: 'Wood' },
  { value: 'metal', label: 'Metal' },
];

export const TIERS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
];

// ---- Site measurement ----
// tiered: priced per range; side: which side of the option decides the range; color: record a colour code
export const CATEGORIES = [
  { key: 'interior', label: 'Interior painting', tiered: true, side: 'interior', color: true },
  { key: 'exterior', label: 'Exterior painting', tiered: true, side: 'exterior', color: true },
  { key: 'texture', label: 'Texture', tiered: true, side: 'interior', color: true },
  { key: 'putty', label: 'Putty', tiered: false, color: false },
  { key: 'waterproof', label: 'Waterproofing', tiered: true, side: 'exterior', color: true },
  { key: 'dampness', label: 'Dampness treatment', tiered: false, color: false },
  { key: 'polish_enamel', label: 'Polish & enamel', tiered: true, side: 'interior', color: true },
  { key: 'heat_reduction', label: 'Heat reduction', tiered: true, side: 'exterior', color: true },
];
export const categoryOf = (k) => CATEGORIES.find((c) => c.key === k) || { key: k, label: k };

const INSIDE_ROOMS = ['Hall', 'Living room', 'Dining', 'Kitchen', 'Bedroom', 'Bathroom', 'Pooja room', 'Staircase', 'Balcony', 'Other'];
const OUTSIDE_AREAS = ['Front elevation', 'Rear elevation', 'Left side', 'Right side', 'Terrace / Roof', 'Sunshade', 'Compound wall', 'Other'];
export const roomsFor = (category) => (categoryOf(category).side === 'exterior' ? OUTSIDE_AREAS : INSIDE_ROOMS);

export const SURFACE_KINDS = ['Wall', 'Ceiling', 'Roof / Terrace', 'Floor', 'Door', 'Window', 'Grill / Gate', 'Other'];
export const FLAT_SURFACES = ['Ceiling', 'Roof / Terrace', 'Floor']; // measured as length x width
export const DEDUCTION_LABELS = ['Door', 'Window', 'Ventilator', 'Opening', 'Other'];
export const DEFAULT_SURFACES = {
  interior: ['Wall', 'Ceiling'], exterior: ['Wall'], texture: ['Wall'], putty: ['Wall', 'Ceiling'],
  waterproof: ['Roof / Terrace'], dampness: ['Wall'], polish_enamel: ['Door'], heat_reduction: ['Roof / Terrace'],
};

export const TIER_LABEL = { economy: 'Economy', premium: 'Premium', luxury: 'Luxury', flat: 'Standard' };
export const sqft = (n) => `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq ft`;
export const DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam',
  'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod', 'Others',
];

export const URGENCY = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'within_1_month', label: 'In one month' },
  { value: 'within_6_months', label: 'In six months' },
];
export const urgencyLabel = (v) => URGENCY.find((u) => u.value === v)?.label || '';

// "Kollam, 691331" / "Kollam" / "691331" / "—"
export const areaOf = (c = {}) => [c.district, c.pincode].filter(Boolean).join(', ') || '—';

export const SLOTS = ['Morning (9am - 12pm)', 'Afternoon (12pm - 3pm)', 'Evening (3pm - 6pm)'];

export const inr = (n) => {
  const v = Number(n || 0);
  const d = Number.isInteger(v) ? 0 : 2;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
};

export const fmtDate = (d, withTime = false) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
      })
    : '—';

export const surfaceLabel = (v) => SURFACE_TYPES.find((s) => s.value === v)?.label || v;
export const tierLabel = (v) => TIERS.find((t) => t.value === v)?.label || v;
