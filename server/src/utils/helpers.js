// Wraps async route handlers so rejected promises reach the error handler
exports.ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.httpError = (status, message) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

exports.escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.pushHistory = (appt, action, user, note = '') => {
  appt.history.push({
    action,
    note,
    by: user?._id || null,
    byName: user?.name || 'Customer',
    at: new Date(),
  });
};

exports.clientUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

// Statuses where the job is still in progress with a manager
exports.OPEN_STATUSES = ['assigned', 'scheduled', 'visited', 'estimate_sent', 'revision_requested'];
