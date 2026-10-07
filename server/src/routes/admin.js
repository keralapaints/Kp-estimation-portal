const router = require('express').Router();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const RateCard = require('../models/RateCard');
const Settings = require('../models/Settings');
const { protect, allow } = require('../middleware/auth');
const { ah, escapeRegex, pushHistory, OPEN_STATUSES } = require('../utils/helpers');

router.use(protect, allow('superadmin'));

/* ---------- Dashboard ---------- */
router.get('/stats', ah(async (req, res) => {
  const [byStatus, managers, unassigned] = await Promise.all([
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'manager', active: true }),
    Appointment.find({ status: 'new' }).sort({ createdAt: -1 }).limit(8)
      .populate('suggestedManager', 'name').lean(),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const approvedValue = await Appointment.aggregate([
    { $match: { status: { $in: ['approved', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$estimate.total' } } },
  ]);
  res.json({ counts, managers, unassigned, approvedValue: approvedValue[0]?.total || 0 });
}));

/* ---------- Managers CRUD ---------- */
const parsePincodes = (p) =>
  (Array.isArray(p) ? p : String(p || '').split(/[\s,]+/)).map((x) => String(x).trim()).filter((x) => /^\d{6}$/.test(x));

router.get('/managers', ah(async (req, res) => {
  const managers = await User.find({ role: 'manager' }).sort({ createdAt: -1 }).lean();
  const counts = await Appointment.aggregate([
    { $match: { assignedTo: { $ne: null } } },
    { $group: {
      _id: '$assignedTo',
      total: { $sum: 1 },
      open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
    } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(managers.map((m) => ({ ...m, openJobs: map[m._id]?.open || 0, totalJobs: map[m._id]?.total || 0 })));
}));

router.post('/managers', ah(async (req, res) => {
  const { name, email, phone, password, region, pincodes, active } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const m = await User.create({ name, email, phone, password, region, pincodes: parsePincodes(pincodes), active: active !== false, role: 'manager' });
  const { password: _, ...safe } = m.toObject();
  res.status(201).json(safe);
}));

router.put('/managers/:id', ah(async (req, res) => {
  const m = await User.findOne({ _id: req.params.id, role: 'manager' });
  if (!m) return res.status(404).json({ message: 'Manager not found' });
  const { name, email, phone, password, region, pincodes, active } = req.body;
  if (name !== undefined) m.name = name;
  if (email !== undefined) m.email = email;
  if (phone !== undefined) m.phone = phone;
  if (region !== undefined) m.region = region;
  if (pincodes !== undefined) m.pincodes = parsePincodes(pincodes);
  if (active !== undefined) m.active = !!active;
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    m.password = password;
  }
  await m.save();
  const { password: _, ...safe } = m.toObject();
  res.json(safe);
}));

router.delete('/managers/:id', ah(async (req, res) => {
  const m = await User.findOne({ _id: req.params.id, role: 'manager' });
  if (!m) return res.status(404).json({ message: 'Manager not found' });

  // Return this manager's open jobs to the unassigned queue
  const open = await Appointment.find({ assignedTo: m._id, status: { $in: OPEN_STATUSES } });
  for (const a of open) {
    a.assignedTo = null;
    if (['assigned', 'scheduled'].includes(a.status)) a.status = 'new';
    pushHistory(a, 'Unassigned', req.user, `Manager ${m.name} was removed`);
    await a.save();
  }
  await m.deleteOne();
  res.json({ message: 'Manager deleted', reassignedCount: open.length });
}));

/* ---------- Appointments ---------- */
router.get('/appointments', ah(async (req, res) => {
  const { status, manager, q } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const filter = {};
  if (status) filter.status = { $in: String(status).split(',') };
  if (manager === 'unassigned') filter.assignedTo = null;
  else if (manager && mongoose.isValidObjectId(manager)) filter.assignedTo = manager;
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ refNo: rx }, { 'customer.name': rx }, { 'customer.mobile': rx }, { 'customer.email': rx }, { 'customer.pincode': rx }];
  }
  const [items, total] = await Promise.all([
    Appointment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('-history -estimate.lineItems')
      .populate('assignedTo', 'name').populate('suggestedManager', 'name').lean(),
    Appointment.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.get('/appointments/:id', ah(async (req, res) => {
  const a = await Appointment.findById(req.params.id)
    .populate('assignedTo', 'name phone email').populate('suggestedManager', 'name');
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  res.json(a);
}));

router.patch('/appointments/:id/assign', ah(async (req, res) => {
  const { managerId } = req.body;
  const a = await Appointment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  if (['cancelled', 'completed'].includes(a.status)) return res.status(409).json({ message: `Cannot assign a ${a.status} appointment` });

  const m = await User.findOne({ _id: managerId, role: 'manager', active: true });
  if (!m) return res.status(400).json({ message: 'Choose an active manager' });

  const reassign = a.assignedTo && String(a.assignedTo) !== String(m._id);
  a.assignedTo = m._id;
  if (a.status === 'new') a.status = 'assigned';
  pushHistory(a, reassign ? 'Reassigned' : 'Assigned', req.user, `Assigned to ${m.name}`);
  await a.save();
  await a.populate('assignedTo', 'name phone email');
  res.json(a);
}));

router.patch('/appointments/:id/status', ah(async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['new', 'cancelled', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Status can only be set to new, cancelled or completed here' });
  const a = await Appointment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  if (status === 'new') a.assignedTo = null;
  a.status = status;
  pushHistory(a, `Marked ${status}`, req.user, note || '');
  await a.save();
  res.json(a);
}));

router.delete('/appointments/:id', ah(async (req, res) => {
  const a = await Appointment.findByIdAndDelete(req.params.id);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  res.json({ message: 'Appointment deleted' });
}));

/* ---------- Rate card & settings ---------- */
router.get('/rates', ah(async (req, res) => {
  const [rates, settings] = await Promise.all([RateCard.find().sort({ surfaceType: 1, tier: 1 }), Settings.getGlobal()]);
  res.json({ rates, settings });
}));

router.put('/rates/:id', ah(async (req, res) => {
  const fields = ['productName', 'paintCoverage', 'paintPrice', 'defaultCoats', 'primerName', 'primerCoverage',
    'primerPrice', 'puttyName', 'puttyCoverage', 'puttyPrice', 'labourRate'];
  const update = Object.fromEntries(fields.filter((f) => req.body[f] !== undefined).map((f) => [f, req.body[f]]));
  const r = await RateCard.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!r) return res.status(404).json({ message: 'Rate not found' });
  res.json(r);
}));

router.put('/settings', ah(async (req, res) => {
  const s = await Settings.getGlobal();
  const { gstRate, crackRepairRate, scrapingRate, dampTreatment } = req.body;
  if (gstRate !== undefined) s.gstRate = gstRate;
  if (crackRepairRate !== undefined) s.crackRepairRate = crackRepairRate;
  if (scrapingRate !== undefined) s.scrapingRate = scrapingRate;
  if (dampTreatment) Object.assign(s.dampTreatment, dampTreatment);
  await s.save();
  res.json(s);
}));

module.exports = router;
