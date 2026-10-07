const mongoose = require('mongoose');
const { Schema } = mongoose;

const SURFACE_TYPES = ['interior', 'exterior', 'waterproofing', 'wood', 'metal'];
const TIERS = ['economy', 'premium', 'luxury'];
const STATUSES = [
  'new',                // booked by customer, not yet assigned
  'assigned',           // super admin assigned a manager
  'scheduled',          // manager fixed a visit date
  'visited',            // measurements saved, estimate generated
  'estimate_sent',      // estimate link shared with the customer
  'revision_requested', // customer asked for changes
  'approved',           // customer approved the estimate
  'completed',          // job finished
  'cancelled',
];

const surfaceSchema = new Schema({
  surfaceType: { type: String, enum: SURFACE_TYPES, required: true },
  label: { type: String, trim: true, default: '' },
  length: Number,
  height: Number,
  area: { type: Number, required: true, min: 0 }, // sq ft
  condition: {
    dampness: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
    cracks: { type: Boolean, default: false },
    flaking: { type: Boolean, default: false },
  },
  tier: { type: String, enum: TIERS, default: 'premium' },
  coats: { type: Number, default: 2, min: 1, max: 5 },
});

const lineItemSchema = new Schema(
  {
    surfaceLabel: String,
    category: { type: String, enum: ['material', 'prep', 'labour'] },
    description: String,
    qty: Number,
    unit: String,
    rate: Number,
    amount: Number,
  },
  { _id: false }
);

const appointmentSchema = new Schema(
  {
    refNo: { type: String, unique: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      mobile: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      address: { type: String, trim: true, default: '' },
    },
    whatsappOptIn: { type: Boolean, default: true },
    preferredDate: Date,
    preferredSlot: { type: String, default: '' },

    status: { type: String, enum: STATUSES, default: 'new', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    suggestedManager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    scheduledAt: Date,

    siteVisit: {
      surfaces: [surfaceSchema],
      notes: { type: String, default: '' },
      visitedAt: Date,
    },

    estimate: {
      lineItems: [lineItemSchema],
      totalArea: Number,
      materialTotal: Number,
      prepTotal: Number,
      labourTotal: Number,
      subtotal: Number,
      gstRate: Number,
      gst: Number,
      total: Number,
      version: { type: Number, default: 0 },
      generatedAt: Date,
      sentAt: Date,
    },
    publicToken: { type: String, index: true, sparse: true },

    customerResponse: {
      action: { type: String, enum: ['approve', 'revise', null], default: null },
      comment: String,
      requestedTier: String,
      at: Date,
    },

    history: [
      {
        action: String,
        note: String,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        byName: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

appointmentSchema.pre('validate', function () {
  if (this.refNo) return;
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  this.refNo = `KP${ymd}${Math.floor(1000 + Math.random() * 9000)}`;
});

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.SURFACE_TYPES = SURFACE_TYPES;
module.exports.TIERS = TIERS;
module.exports.STATUSES = STATUSES;
