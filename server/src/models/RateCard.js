const mongoose = require('mongoose');

// One row per category + range. Rate is all-inclusive (material + labour) in ₹ per sq ft, before GST.
// Categories without ranges (putty, dampness) use a single row with tier 'flat'.
const rateCardSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    tier: { type: String, enum: ['economy', 'premium', 'luxury', 'flat'], required: true },
    productName: { type: String, default: '' },
    rate: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);
rateCardSchema.index({ category: 1, tier: 1 }, { unique: true });

module.exports = mongoose.model('RateCard', rateCardSchema);
