const router = require('express').Router();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const RateCard = require('../models/RateCard');
const Settings = require('../models/Settings');
const { protect, allow } = require('../middleware/auth');
const { ah, escapeRegex, pushHistory, OPEN_STATUSES } = require('../utils/helpers');
const { byKey, TIERS } = require('../utils/categories');

router.use(protect, allow('superadmin'));

// Roles the super admin (team lead) can create
const TEAM_ROLES = ['crm', 'project_manager', 'manager'];
const ROLE_NAME = { crm: 'CRM', project_manager: 'Project manager', manager: 'Field inspector' };

/* ---------- Dashboard ---------- */
router.get('/stats', ah(async (req, res) => {
  const [byStatus, team, newLeads, approvedValue] = await Promise.all([
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: { $in: TEAM_ROLES }, active: true } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Appointment.find({ status: 'new' }).sort({ createdAt: -1 }).limit(8).lean(),
    Appointment.aggregate([
      { $match: { status: { $in: ['approved', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$estimate.total' } } },
    ]),
  ]);
  res.json({
    counts: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    team: Object.fromEntries(team.map((t) => [t._id, t.count])),
    newLeads,
    approvedValue: approvedValue[0]?.total || 0,
  });
}));

/* ---------- Team (CRM, project managers, field inspectors) CRUD ---------- */
const parsePincodes = (p) =>
  (Array.isArray(p) ? p : String(p || '').split(/[\s,]+/)).map((x) => String(x).trim()).filter((x) => /^\d{6}$/.test(x));

router.get('/users', ah(async (req, res) => {
  const filter = { role: TEAM_ROLES.includes(req.query.role) ? req.query.role : { $in: TEAM_ROLES } };
  const users = await User.find(filter).sort({ role: 1, createdAt: -1 }).lean();

  const [inspectorJobs, crmJobs] = await Promise.all([
    Appointment.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', total: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } } } },
    ]),
    Appointment.aggregate([
      { $match: { assignedCrm: { $ne: null } } },
      { $group: { _id: '$assignedCrm', total: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'crm_assigned'] }, 1, 0] } } } },
    ]),
  ]);
  const ins = Object.fromEntries(inspectorJobs.map((c) => [String(c._id), c]));
  const crm = Object.fromEntries(crmJobs.map((c) => [String(c._id), c]));

  res.json(users.map((u) => {
    const c = u.role === 'crm' ? crm[u._id] : u.role === 'manager' ? ins[u._id] : null;
    return { ...u, openJobs: c?.open || 0, totalJobs: c?.total || 0 };
  }));
}));

router.post('/users', ah(async (req, res) => {
  const { name, email, phone, password, role, region, pincodes, active } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!TEAM_ROLES.includes(role)) return res.status(400).json({ message: 'Choose a role' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const u = await User.create({ name, email, phone, password, role, region, pincodes: parsePincodes(pincodes), active: active !== false });
  const { password: _, ...safe } = u.toObject();
  res.status(201).json(safe);
}));

router.put('/users/:id', ah(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: { $in: TEAM_ROLES } });
  if (!u) return res.status(404).json({ message: 'User not found' });
  const { name, email, phone, password, role, region, pincodes, active } = req.body;
  if (name !== undefined) u.name = name;
  if (email !== undefined) u.email = email;
  if (phone !== undefined) u.phone = phone;
  if (region !== undefined) u.region = region;
  if (pincodes !== undefined) u.pincodes = parsePincodes(pincodes);
  if (active !== undefined) u.active = !!active;
  if (role !== undefined) {
    if (!TEAM_ROLES.includes(role)) return res.status(400).json({ message: 'Choose a valid role' });
    u.role = role;
  }
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    u.password = password;
  }
  await u.save();
  const { password: _, ...safe } = u.toObject();
  res.json(safe);
}));

router.delete('/users/:id', ah(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: { $in: TEAM_ROLES } });
  if (!u) return res.status(404).json({ message: 'User not found' });

  let returned = 0;
  if (u.role === 'crm') {
    // Leads still being verified go back to the team lead
    const open = await Appointment.find({ assignedCrm: u._id, status: 'crm_assigned' });
    for (const a of open) {
      a.assignedCrm = null;
      a.status = 'new';
      pushHistory(a, 'CRM unassigned', req.user, `${u.name} was removed`);
      await a.save();
    }
    returned = open.length;
  }
  if (u.role === 'manager') {
    // Inspector's open jobs go back to the project manager queue
    const open = await Appointment.find({ assignedTo: u._id, status: { $in: OPEN_STATUSES } });
    for (const a of open) {
      a.assignedTo = null;
      if (['assigned', 'scheduled'].includes(a.status)) a.status = 'awaiting_inspection';
      pushHistory(a, 'Inspector unassigned', req.user, `${u.name} was removed`);
      await a.save();
    }
    returned = open.length;
  }
  await u.deleteOne();
  res.json({ message: `${ROLE_NAME[u.role]} deleted`, returnedCount: returned });
}));

/* ---------- Appointments ---------- */
router.get('/appointments', ah(async (req, res) => {
  const { status, crm, manager, q } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const filter = {};
  if (status) filter.status = { $in: String(status).split(',') };
  if (crm === 'unassigned') filter.assignedCrm = null;
  else if (crm && mongoose.isValidObjectId(crm)) filter.assignedCrm = crm;
  if (manager === 'unassigned') filter.assignedTo = null;
  else if (manager && mongoose.isValidObjectId(manager)) filter.assignedTo = manager;
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ refNo: rx }, { 'customer.name': rx }, { 'customer.mobile': rx }, { 'customer.email': rx }, { 'customer.pincode': rx }];
  }
  const [items, total] = await Promise.all([
    Appointment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
            .select('-history -siteVisit -estimate.options')
      .populate('assignedCrm', 'name').populate('assignedTo', 'name').populate('suggestedManager', 'name').lean(),
    Appointment.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.get('/appointments/:id', ah(async (req, res) => {
  const a = await Appointment.findById(req.params.id)
    .populate('assignedCrm', 'name phone email')
    .populate('assignedTo', 'name phone email')
    .populate('inspectionAssignedBy', 'name')
    .populate('suggestedManager', 'name');
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  res.json(a);
}));

// Team lead assigns a new lead to a CRM
router.patch('/appointments/:id/assign-crm', ah(async (req, res) => {
  const a = await Appointment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  if (!['new', 'crm_assigned'].includes(a.status)) {
    return res.status(409).json({ message: 'CRM can only be assigned before the lead is verified' });
  }
  const crm = await User.findOne({ _id: req.body.crmId, role: 'crm', active: true });
  if (!crm) return res.status(400).json({ message: 'Choose an active CRM' });

  const reassign = a.assignedCrm && String(a.assignedCrm) !== String(crm._id);
  a.assignedCrm = crm._id;
  a.status = 'crm_assigned';
  pushHistory(a, reassign ? 'CRM reassigned' : 'CRM assigned', req.user, `Assigned to ${crm.name}`);
  await a.save();
  res.json(a);
}));

// Team lead can also assign a field inspector directly (overrides the project manager)
router.patch('/appointments/:id/assign', ah(async (req, res) => {
  const a = await Appointment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  if (['new', 'crm_assigned', 'invalid', 'cancelled', 'completed'].includes(a.status)) {
    return res.status(409).json({ message: 'The lead must be verified by CRM before an inspector is assigned' });
  }
  const m = await User.findOne({ _id: req.body.managerId, role: 'manager', active: true });
  if (!m) return res.status(400).json({ message: 'Choose an active field inspector' });

  const reassign = a.assignedTo && String(a.assignedTo) !== String(m._id);
  a.assignedTo = m._id;
  a.inspectionAssignedBy = req.user._id;
  if (a.status === 'awaiting_inspection') a.status = 'assigned';
  pushHistory(a, reassign ? 'Inspector reassigned' : 'Inspector assigned', req.user, `Assigned to ${m.name}`);
  await a.save();
  res.json(a);
}));

router.patch('/appointments/:id/status', ah(async (req, res) => {
  const { status, note } = req.body;
  if (!['new', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Status can only be set to new, cancelled or completed here' });
  }
  const a = await Appointment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  if (status === 'new') {
    // Reopen from the start of the pipeline
    a.assignedCrm = null;
    a.assignedTo = null;
    a.crmVerification = { result: null, note: '' };
  }
  a.status = status;
  pushHistory(a, status === 'new' ? 'Reopened' : `Marked ${status}`, req.user, note || '');
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
  const [rates, settings] = await Promise.all([RateCard.find().sort({ category: 1, tier: 1 }), Settings.getGlobal()]);
  res.json({ rates, settings });
}));

// Save one category's rates in one go: { rates: [{ tier, rate, productName }] }
router.put('/rates/:category', ah(async (req, res) => {
  const cat = byKey(req.params.category);
  if (!cat) return res.status(404).json({ message: 'Unknown category' });
  const allowed = cat.tiered ? TIERS : ['flat'];
  for (const r of req.body.rates || []) {
    if (!allowed.includes(r.tier)) continue;
    const rate = Number(r.rate);
    if (!(rate >= 0)) return res.status(400).json({ message: `Enter a valid rate for ${cat.label}` });
    await RateCard.findOneAndUpdate(
      { category: cat.key, tier: r.tier },
      { rate, productName: String(r.productName || '').slice(0, 80) },
      { upsert: true, new: true, runValidators: true }
    );
  }
  res.json(await RateCard.find({ category: cat.key }));
}));

// { gstRate, packages: [{ key, label, interior, exterior }] }
router.put('/settings', ah(async (req, res) => {
  const s = await Settings.getGlobal();
  const { gstRate, packages } = req.body;
  if (gstRate !== undefined) {
    if (!(Number(gstRate) >= 0)) return res.status(400).json({ message: 'Enter a valid GST %' });
    s.gstRate = Number(gstRate);
  }
  if (Array.isArray(packages)) {
    if (packages.length < 1 || packages.length > 5) return res.status(400).json({ message: 'Keep between 1 and 5 options' });
    s.packages = packages.map((p, i) => ({
      key: String(p.key || `option${i + 1}`).toLowerCase().replace(/[^a-z0-9_]/g, '') || `option${i + 1}`,
      label: String(p.label || `Option ${i + 1}`).slice(0, 40),
      interior: TIERS.includes(p.interior) ? p.interior : 'premium',
      exterior: TIERS.includes(p.exterior) ? p.exterior : 'premium',
    }));
  }
  await s.save();
  res.json(s);
}));

module.exports = router;
