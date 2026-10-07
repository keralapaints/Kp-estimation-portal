export const STATUS = {
  new: { label: 'New', tone: 'turmeric' },
  assigned: { label: 'Assigned', tone: 'sky' },
  scheduled: { label: 'Visit scheduled', tone: 'sky' },
  visited: { label: 'Estimate ready', tone: 'violet' },
  estimate_sent: { label: 'Estimate sent', tone: 'violet' },
  revision_requested: { label: 'Changes requested', tone: 'laterite' },
  approved: { label: 'Approved', tone: 'leaf' },
  completed: { label: 'Completed', tone: 'ink' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

// Order of the job pipeline (used on the dashboard)
export const PIPELINE = ['new', 'assigned', 'scheduled', 'visited', 'estimate_sent', 'revision_requested', 'approved', 'completed'];

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
