const router = require('express').Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { protect, allow } = require('../middleware/auth');
const { ah, pushHistory } = require('../utils/helpers');

router.use(protect, allow('crm'));

// CRM can edit / re-verify until a project manager assigns an inspector
const EDITABLE = ['crm_assigned', 'awaiting_inspection', 'invalid'];

const findMine = async (req) => {
  const a = await Appointment.findOne({ _id: req.params.id, assignedCrm: req.user._id });
  if (!a) {
    const e = new Error('Lead not found or not assigned to you');
    e.status = 404;
    throw e;
  }
  return a;
};

router.get('/appointments', ah(async (req, res) => {
  const filter = { assignedCrm: req.user._id };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  const items = await Appointment.find(filter).sort({ updatedAt: -1 })
        .select('refNo status customer urgency preferredDate preferredSlot crmVerification createdAt updatedAt').lean();
  res.json(items);
}));

router.get('/appointments/:id', ah(async (req, res) => {
  const a = await findMine(req);
  await a.populate('assignedTo', 'name phone');
  res.json(a);
}));

// Correct the customer's details after calling them
// Correct the customer's details after calling them
router.put('/appointments/:id/customer', ah(async (req, res) => {
  const a = await findMine(req);
  if (!EDITABLE.includes(a.status)) {
    return res.status(409).json({ message: 'An inspector is already assigned. Ask the project manager to make changes.' });
  }
  const { name, email, mobile, district, pincode, address, urgency, preferredDate, preferredSlot } = req.body;
  const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter the customer name';
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (district && !Appointment.DISTRICTS.includes(district)) errors.district = 'Choose a district from the list';
  if (pincode && !/^\d{6}$/.test(String(pincode))) errors.pincode = 'Enter a 6-digit pincode';
  if (urgency && !Appointment.URGENCY.includes(urgency)) errors.urgency = 'Choose a painting urgency';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please check the highlighted fields', errors });

  const before = { ...a.customer.toObject(), urgency: a.urgency };
  const after = {
    name: name.trim(), email: (email || '').trim().toLowerCase(), mobile: cleanMobile,
    district: district || '', pincode: pincode ? String(pincode) : '', address: address || '',
  };
  const changed = [...Object.keys(after), 'urgency'].filter((k) =>
    String(before[k] || '') !== String(k === 'urgency' ? urgency || '' : after[k]));

  a.customer = after;
  a.urgency = urgency || '';
  a.preferredDate = preferredDate || undefined;
  a.preferredSlot = preferredSlot || '';
  if (changed.includes('pincode')) {
    const s = after.pincode ? await User.findOne({ role: 'manager', active: true, pincodes: after.pincode }).select('_id') : null;
    a.suggestedManager = s?._id || null;
  }
  pushHistory(a, 'Customer details updated', req.user, changed.length ? `Changed: ${changed.join(', ')}` : 'Visit preference updated');
  await a.save();
  res.json(a);
}));

// Genuine site visit? waiting_inspection -> project manager queue, wrong -> closed
router.patch('/appointments/:id/verify', ah(async (req, res) => {
  const a = await findMine(req);
  const { result, note } = req.body;
  if (!['waiting_inspection', 'wrong'].includes(result)) return res.status(400).json({ message: 'Choose Waiting for site inspection or Wrong' });
  if (result === 'wrong' && !String(note || '').trim()) return res.status(400).json({ message: 'Add a reason for marking this lead wrong' });
  if (!EDITABLE.includes(a.status)) {
    return res.status(409).json({ message: 'An inspector is already assigned to this lead' });
  }

  a.crmVerification = { result, note: note || '', at: new Date(), by: req.user._id };
  a.status = result === 'waiting_inspection' ? 'awaiting_inspection' : 'invalid';
  pushHistory(a, result === 'waiting_inspection' ? 'Verified: waiting for site inspection' : 'Marked wrong lead', req.user, note || '');
  await a.save();
  res.json(a);
}));

module.exports = router;