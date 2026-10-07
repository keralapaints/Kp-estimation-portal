const mongoose = require('mongoose');

// One row per surface type + product tier. All prices in INR (before GST).
const rateCardSchema = new mongoose.Schema(
  {
    surfaceType: { type: String, required: true },
    tier: { type: String, required: true },
    productName: { type: String, required: true },
    paintCoverage: { type: Number, required: true }, // sq ft per litre per coat
    paintPrice: { type: Number, required: true },    // per litre
    defaultCoats: { type: Number, default: 2 },
    primerName: { type: String, default: 'Primer' },
    primerCoverage: { type: Number, default: 0 },    // sq ft per litre, 0 = not used
    primerPrice: { type: Number, default: 0 },
    puttyName: { type: String, default: 'Wall putty' },
    puttyCoverage: { type: Number, default: 0 },     // sq ft per kg per coat, 0 = not used
    puttyPrice: { type: Number, default: 0 },
    labourRate: { type: Number, required: true },    // per sq ft
  },
  { timestamps: true }
);
rateCardSchema.index({ surfaceType: 1, tier: 1 }, { unique: true });

module.exports = mongoose.model('RateCard', rateCardSchema);
