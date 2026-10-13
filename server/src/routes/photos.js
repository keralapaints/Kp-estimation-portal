const router = require('express').Router();
const Photo = require('../models/Photo');
const Appointment = require('../models/Appointment');
const { protect, allow } = require('../middleware/auth');
const { ah } = require('../utils/helpers');

const MAX_BYTES = 3 * 1024 * 1024;

// Field inspector uploads a photo for one of their appointments. Body: { appointmentId, dataUrl }
router.post('/', protect, allow('manager'), ah(async (req, res) => {
  const { appointmentId, dataUrl } = req.body;
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) return res.status(400).json({ message: 'Upload a JPG, PNG or WebP image' });
  const data = Buffer.from(m[3], 'base64');
  if (data.length > MAX_BYTES) return res.status(400).json({ message: 'Photo is too large (max 3 MB)' });

  const appt = await Appointment.findOne({ _id: appointmentId, assignedTo: req.user._id }).select('_id');
  if (!appt) return res.status(404).json({ message: 'Appointment not found or not assigned to you' });

  const photo = await Photo.create({ appointment: appt._id, uploadedBy: req.user._id, contentType: m[1], data });
  res.status(201).json({ id: photo._id });
}));

// Anyone with the link can view (used in <img> tags for staff and the customer portal)
router.get('/:id', ah(async (req, res) => {
  const photo = await Photo.findById(req.params.id).select('contentType data');
  if (!photo) return res.status(404).end();
  res.set('Content-Type', photo.contentType);
  res.set('Cache-Control', 'private, max-age=86400');
  res.send(photo.data);
}));

module.exports = router;