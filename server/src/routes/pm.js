const router = require('express').Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { protect, allow } = require('../middleware/auth');
const { ah, pushHistory, OPEN_STATUSES } = require('../utils/helpers');

router.use(protect, allow('project_manager'));

// view=queue  -> verified leads waiting for an inspector (shared by all project managers)
// view=mine   -> leads this project manager has assigned
router.get('/appointments', ah(async (req, res) => {
  const filter = req.query.view === 'mine'
    ? { inspectionAssignedBy: req.user._id, status: { $ne: 'awaiting_inspection' } }
    : { status: 'awaiting_inspection' };
  const items = await Appointment.find(filter).sort({ updatedAt: -1 })
        .select('-history -siteVisit -estimate.options')
    .populate('assignedCrm', 'name').populate('assignedTo', 'name phone').populate('suggestedManager', 'name')
    .lean();
  res.json(items);
}));

// Field inspectors with their current workload
router.get('/inspectors', ah(async (req, res) => {
  const inspectors = await User.find({ role: 'manager', active: true }).sort({ name: 1 }).lean();
  const counts = await Appointment.aggregate([
    { $match: { assignedTo: { $ne: null }, status: { $in: OPEN_STATUSES } } },
    { $group: { _id: '$assignedTo', open: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.open]));
  res.json(inspectors.map((m) => ({ _id: m._id, name: m.name, phone: m.phone, region: m.region, pincodes: m.pincodes, active: m.active, openJobs: map[m._id] || 0 })));
}));

router.patch('/appointments/:id/assign', ah(async (req, res) => {
  const a = await Appointment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Lead not found' });
  if (!['awaiting_inspection', 'assigned', 'scheduled'].includes(a.status)) {
    return res.status(409).json({ message: 'Only verified leads that are not yet visited can be assigned' });
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

module.exports = router;