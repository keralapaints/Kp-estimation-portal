const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { ah, pushHistory } = require('../utils/helpers');

const bookingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many bookings from this network. Try again in a few minutes.' } });

// Customer books a site visit from the landing page
router.post('/appointments', bookingLimiter, ah(async (req, res) => {
  const { name, email, mobile, pincode, address, preferredDate, preferredSlot, whatsappOptIn, consent } = req.body;
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter your name';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email';
  const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
  if (!/^\d{6}$/.test(String(pincode || ''))) errors.pincode = 'Enter a 6-digit pincode';
  if (!consent) errors.consent = 'Please accept the terms to continue';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please check the highlighted fields', errors });

  const suggested = await User.findOne({ role: 'manager', active: true, pincodes: String(pincode) }).select('_id');

  const appt = new Appointment({
    customer: { name: name.trim(), email, mobile: cleanMobile, pincode: String(pincode), address: address || '' },
    whatsappOptIn: whatsappOptIn !== false,
    preferredDate: preferredDate || undefined,
    preferredSlot: preferredSlot || '',
    suggestedManager: suggested?._id || null,
  });
  pushHistory(appt, 'Booked', null, 'Customer booked a site visit online');
  await appt.save();

  res.status(201).json({ refNo: appt.refNo, message: 'Booking received' });
}));

const publicEstimate = (a) => ({
  refNo: a.refNo,
  status: a.status,
  customer: { name: a.customer.name, pincode: a.customer.pincode, address: a.customer.address },
  manager: a.assignedTo ? { name: a.assignedTo.name, phone: a.assignedTo.phone } : null,
  surfaces: a.siteVisit?.surfaces || [],
  visitedAt: a.siteVisit?.visitedAt,
  estimate: a.estimate,
  customerResponse: a.customerResponse,
});

// Customer opens the estimate link shared on WhatsApp
router.get('/estimate/:token', ah(async (req, res) => {
  const a = await Appointment.findOne({ publicToken: req.params.token }).populate('assignedTo', 'name phone');
  if (!a || !a.estimate?.total) return res.status(404).json({ message: 'This estimate link is not valid' });
  res.json(publicEstimate(a));
}));

// Customer approves or asks for changes
router.post('/estimate/:token/respond', ah(async (req, res) => {
  const { action, comment, requestedTier } = req.body;
  if (!['approve', 'revise'].includes(action)) return res.status(400).json({ message: 'Choose approve or request changes' });
  if (action === 'revise' && !comment?.trim() && !requestedTier) {
    return res.status(400).json({ message: 'Tell us what you would like changed' });
  }

  const a = await Appointment.findOne({ publicToken: req.params.token }).populate('assignedTo', 'name phone');
  if (!a) return res.status(404).json({ message: 'This estimate link is not valid' });
  if (a.status !== 'estimate_sent') {
    return res.status(409).json({ message: 'This estimate has already been responded to or is being updated' });
  }

  a.customerResponse = { action, comment: comment || '', requestedTier: requestedTier || '', at: new Date() };
  a.status = action === 'approve' ? 'approved' : 'revision_requested';
  pushHistory(a, action === 'approve' ? 'Customer approved estimate' : 'Customer requested changes', null,
    [requestedTier && `Wants ${requestedTier} tier`, comment].filter(Boolean).join(' - '));
  await a.save();
  res.json(publicEstimate(a));
}));

module.exports = router;
