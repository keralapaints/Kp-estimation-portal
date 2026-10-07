const mongoose = require('mongoose');

// Single document holding global estimate settings
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    gstRate: { type: Number, default: 18 },
    crackRepairRate: { type: Number, default: 6 }, // per sq ft
    scrapingRate: { type: Number, default: 4 },    // per sq ft
    dampTreatment: {
      low: { type: Number, default: 8 },
      medium: { type: Number, default: 15 },
      high: { type: Number, default: 25 },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getGlobal = async function () {
  let s = await this.findOne({ key: 'global' });
  if (!s) s = await this.create({ key: 'global' });
  return s;
};

module.exports = mongoose.model('Settings', settingsSchema);
