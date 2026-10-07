const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Appointment = require('../models/Appointment');
const { signCustomerToken, protectCustomer } = require('../middleware/customerAuth');
const { ah, pushHistory } = require('../utils/helpers');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in a few minutes.' } });

// Shape sent to the customer: no internal notes, no staff ids
const forCustomer = (a) => ({
  _id: a._id,
  refNo: a.refNo,
  status: a.status,
  createdAt: a.createdAt,
  customer: a.customer,
  preferredDate: a.preferredDate,
  preferredSlot: a.preferredSlot,
  scheduledAt: a.scheduledAt,
  manager: a.assignedTo ? { name: a.assignedTo.name, phone: a.assignedTo.phone } : null,
  surfaces: a.siteVisit?.surfaces || [],
  visitedAt: a.siteVisit?.visitedAt,
  // Only show the estimate once it has been sent to the customer
  estimate: ['estimate_sent', 'revision_requested', 'approved', 'completed'].includes(a.status) ? a.estimate : null,
  customerResponse: a.customerResponse,
});

const sessionFor = (a) => ({
  token: signCustomerToken(a.customer.mobile),
  customer: { name: a.customer.name, mobile: a.customer.mobile },
});

// Log in with mobile number + any booking reference
router.post('/login', loginLimiter, ah(async (req, res) => {
  const mobile = String(req.body.mobile || '').replace(/\D/g, '').slice(-10);
  const refNo = String(req.body.refNo || '').trim().toUpperCase();
  if (!/^\d{10}$/.test(mobile) || !refNo) return res.status(400).json({ message: 'Enter your mobile number and booking reference' });

  const a = await Appointment.findOne({ refNo, 'customer.mobile': mobile });
  if (!a) return res.status(401).json({ message: 'No booking found with that mobile number and reference' });
  res.json(sessionFor(a));
}));

// One-tap login from the WhatsApp link
router.post('/link-login', loginLimiter, ah(async (req, res) => {
  const a = await Appointment.findOne({ publicToken: String(req.body.token || '') });
  if (!a) return res.status(404).json({ message: 'This link is not valid. Log in with your mobile number and booking reference.' });
  res.json({ ...sessionFor(a), appointmentId: a._id });
}));

router.use(protectCustomer);

router.get('/me', ah(async (req, res) => {
  const a = await Appointment.findOne({ 'customer.mobile': req.customerMobile }).sort({ createdAt: -1 });
  if (!a) return res.status(404).json({ message: 'No bookings found' });
  res.json({ customer: { name: a.customer.name, mobile: a.customer.mobile } });
}));

router.get('/appointments', ah(async (req, res) => {
  const list = await Appointment.find({ 'customer.mobile': req.customerMobile })
    .sort({ createdAt: -1 }).populate('assignedTo', 'name phone');
  res.json(list.map(forCustomer));
}));

router.get('/appointments/:id', ah(async (req, res) => {
  const a = await Appointment.findOne({ _id: req.params.id, 'customer.mobile': req.customerMobile })
    .populate('assignedTo', 'name phone');
  if (!a) return res.status(404).json({ message: 'Booking not found' });
  res.json(forCustomer(a));
}));

router.post('/appointments/:id/respond', ah(async (req, res) => {
  const { action, comment, requestedTier } = req.body;
  if (!['approve', 'revise'].includes(action)) return res.status(400).json({ message: 'Choose approve or request changes' });
  if (action === 'revise' && !comment?.trim() && !requestedTier) {
    return res.status(400).json({ message: 'Tell us what you would like changed' });
  }

  const a = await Appointment.findOne({ _id: req.params.id, 'customer.mobile': req.customerMobile })
    .populate('assignedTo', 'name phone');
  if (!a) return res.status(404).json({ message: 'Booking not found' });
  if (a.status !== 'estimate_sent') {
    return res.status(409).json({ message: 'This estimate has already been answered or is being updated' });
  }

  a.customerResponse = { action, comment: comment || '', requestedTier: requestedTier || '', at: new Date() };
  a.status = action === 'approve' ? 'approved' : 'revision_requested';
  pushHistory(a, action === 'approve' ? 'Customer approved estimate' : 'Customer requested changes', null,
    [requestedTier && `Wants ${requestedTier} range`, comment].filter(Boolean).join(' - '));
  await a.save();
  res.json(forCustomer(a));
}));

module.exports = router;