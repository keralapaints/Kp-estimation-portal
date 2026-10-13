const mongoose = require('mongoose');

// Site photos, stored in MongoDB (compressed in the browser to ~200-400 KB each)
const photoSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Photo', photoSchema);