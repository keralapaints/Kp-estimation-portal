const jwt = require('jsonwebtoken');

// Customers have no account: they are identified by the mobile number on their bookings.
exports.signCustomerToken = (mobile) =>
  jwt.sign({ type: 'customer', mobile }, process.env.JWT_SECRET, { expiresIn: '30d' });

exports.protectCustomer = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please log in to see your bookings' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'customer' || !decoded.mobile) throw new Error('bad token');
    req.customerMobile = decoded.mobile;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
};