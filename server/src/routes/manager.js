const router = require('express').Router();
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const RateCard = require('../models/RateCard');
const Settings = require('../models/Settings');
const { protect, allow } = require('../middleware/auth');
const { ah, pushHistory, clientUrl } = require('../utils/helpers');
const { normalizeSiteVisit, computeEstimate } = require('../utils/estimate');

// 'manager' = field inspector
router.use(protect, allow('manager'));

const findMine = async (req) => {
  const a = await Appointment.findOne({ _id: req.params.id, assignedTo: req.user._id });
  if (!a) {
    const e = new Error('Appointment not found or not assigned to you');
    e.status = 404;
    throw e;
  }
  return a;
};

const rs = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const estimateLinks = (a) => {
  // Opens the customer portal and logs the customer in automatically
  const shareUrl = `${clientUrl()}/my/open/${a.publicToken}`;
  const opts = a.estimate.options || [];
  const text = [
    `Hello ${a.customer.name},`,
    '',
    `Your Kerala Paints painting estimate is ready.`,
    `Booking ref: ${a.refNo}`,
    `Total area: ${a.estimate.totalSqft} sq ft`,
    '',
    ...opts.map((o) => `${o.label}: Rs ${rs(o.total)}`),
    '(all prices incl. GST)',
    '',
    `See the full breakdown and choose your option here:`,
    shareUrl,
    '',
    `You can also log in any time at ${clientUrl()}/my with your mobile number and booking ref.`,
  ].join('\n');
  return { shareUrl, whatsappUrl: `https://wa.me/91${a.customer.mobile}?text=${encodeURIComponent(text)}` };
};

router.get('/appointments', ah(async (req, res) => {
  const filter = { assignedTo: req.user._id };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  const items = await Appointment.find(filter).sort({ updatedAt: -1 })
    .select('-history -siteVisit -estimate.options').lean();
  res.json(items);
}));

router.get('/appointments/:id', ah(async (req, res) => {
  const a = await findMine(req);
  const out = a.toObject();
  if (a.publicToken && a.estimate?.options?.length) Object.assign(out, estimateLinks(a));
  res.json(out);
}));

router.patch('/appointments/:id/schedule', ah(async (req, res) => {
  const a = await findMine(req);
  const { scheduledAt, note } = req.body;
  if (!scheduledAt || isNaN(new Date(scheduledAt))) return res.status(400).json({ message: 'Pick a visit date and time' });
  if (!['assigned', 'scheduled'].includes(a.status)) return res.status(409).json({ message: 'The visit can only be scheduled before measurements are saved' });
  a.scheduledAt = new Date(scheduledAt);
  a.status = 'scheduled';
  pushHistory(a, 'Visit scheduled', req.user, `${a.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note ? ` - ${note}` : ''}`);
  await a.save();
  res.json(a);
}));

// Live preview while the inspector types - nothing is saved
router.post('/appointments/:id/preview-estimate', ah(async (req, res) => {
  await findMine(req);
  const [rates, settings] = await Promise.all([RateCard.find(), Settings.getGlobal()]);
  const visit = normalizeSiteVisit(req.body);
  res.json({ siteVisit: visit, estimate: computeEstimate(visit, rates, settings) });
}));

// Save measurements and generate the three-option estimate
router.put('/appointments/:id/site-visit', ah(async (req, res) => {
  const a = await findMine(req);
  if (['approved', 'completed', 'cancelled'].includes(a.status)) {
    return res.status(409).json({ message: `This appointment is ${a.status}; measurements are locked` });
  }
  const [rates, settings] = await Promise.all([RateCard.find(), Settings.getGlobal()]);
  const visit = normalizeSiteVisit(req.body);
  const est = computeEstimate(visit, rates, settings);

  a.siteVisit = { ...visit, visitedAt: a.siteVisit?.visitedAt || new Date() };
  a.estimate = { ...est, version: (a.estimate?.version || 0) + 1, generatedAt: new Date() };
  if (!a.publicToken) a.publicToken = crypto.randomBytes(16).toString('hex');
  a.status = 'visited';
  pushHistory(a, `Estimate v${a.estimate.version} generated`, req.user,
    `${est.categories.map((c) => `${c.label} ${c.sqft} sq ft`).join(', ')}. ${est.options.map((o) => `${o.label} Rs ${rs(o.total)}`).join(', ')}`);
  await a.save();
  res.json({ ...a.toObject(), ...estimateLinks(a) });
}));

router.patch('/appointments/:id/send-estimate', ah(async (req, res) => {
  const a = await findMine(req);
  if (!a.estimate?.options?.length) return res.status(400).json({ message: 'Generate the estimate first' });
  if (!['visited', 'estimate_sent', 'revision_requested'].includes(a.status)) {
    return res.status(409).json({ message: `Cannot send an estimate while the appointment is ${a.status}` });
  }
  a.status = 'estimate_sent';
  a.estimate.sentAt = new Date();
  a.customerResponse = { action: null };
  pushHistory(a, `Estimate v${a.estimate.version} sent`, req.user, 'Shared with customer on WhatsApp');
  await a.save();
  res.json({ ...a.toObject(), ...estimateLinks(a) });
}));

router.patch('/appointments/:id/complete', ah(async (req, res) => {
  const a = await findMine(req);
  if (a.status !== 'approved') return res.status(409).json({ message: 'Only approved jobs can be marked completed' });
  a.status = 'completed';
  pushHistory(a, 'Job completed', req.user, req.body.note || '');
  await a.save();
  res.json(a);
}));

module.exports = router;