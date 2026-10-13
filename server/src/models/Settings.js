const mongoose = require('mongoose');
const { DEFAULT_PACKAGES } = require('../utils/categories');

const packageSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  interior: { type: String, enum: ['economy', 'premium', 'luxury'], required: true },
  exterior: { type: String, enum: ['economy', 'premium', 'luxury'], required: true },
}, { _id: false });

// Single document holding global estimate settings
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    gstRate: { type: Number, default: 18 },
    packages: { type: [packageSchema], default: () => DEFAULT_PACKAGES },
  },
  { timestamps: true, strict: false }
);

settingsSchema.statics.getGlobal = async function () {
  let s = await this.findOne({ key: 'global' });
  if (!s) s = await this.create({ key: 'global' });
  if (!s.packages?.length) {
    s.packages = DEFAULT_PACKAGES;
    await s.save();
  }
  return s;
};

module.exports = mongoose.model('Settings', settingsSchema);
