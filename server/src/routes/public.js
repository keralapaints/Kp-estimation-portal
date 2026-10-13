const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { ah, pushHistory } = require('../utils/helpers');

const bookingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many bookings from this network. Try again in a few minutes.' } });

// Customer books a site visit from the landing page
// Customer books a site visit from the landing page
router.post('/appointments', bookingLimiter, ah(async (req, res) => {
  const { name, mobile, email, district, pincode, urgency, preferredDate, preferredSlot } = req.body;
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter your name';
  const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
  // Optional fields: only checked when filled in
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (district && !Appointment.DISTRICTS.includes(district)) errors.district = 'Choose a district from the list';
  if (pincode && !/^\d{6}$/.test(String(pincode))) errors.pincode = 'Enter a 6-digit pincode';
  if (urgency && !Appointment.URGENCY.includes(urgency)) errors.urgency = 'Choose when you want to paint';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please check the highlighted fields', errors });

  const suggested = pincode
    ? await User.findOne({ role: 'manager', active: true, pincodes: String(pincode) }).select('_id')
    : null;

  const appt = new Appointment({
    customer: { name: name.trim(), mobile: cleanMobile, email: email || '', district: district || '', pincode: pincode ? String(pincode) : '' },
    urgency: urgency || '',
    preferredDate: preferredDate || undefined,
    preferredSlot: preferredSlot || '',
    suggestedManager: suggested?._id || null,
  });
  pushHistory(appt, 'Booked', null, 'Customer booked a site visit online');
  await appt.save();

  res.status(201).json({ refNo: appt.refNo, message: 'Booking received' });
}));


module.exports = router;
