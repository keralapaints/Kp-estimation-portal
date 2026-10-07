const router = require('express').Router();
const User = require('../models/User');
const { protect, signToken } = require('../middleware/auth');
const { ah } = require('../utils/helpers');

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, region: u.region });

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password' });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Email or password is incorrect' });
  }
  if (!user.active) return res.status(403).json({ message: 'This account is disabled. Contact the super admin.' });

  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.put('/password', protect, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword || ''))) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
}));

module.exports = router;
