const mongoose = require('mongoose');
const { Schema } = mongoose;

const TIERS = ['economy', 'premium', 'luxury'];
const DISTRICTS = ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam',
  'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod', 'Others'];
const URGENCY = ['immediate', 'within_1_month', 'within_6_months'];
const STATUSES = [
  'new',                 // booked by customer, waiting for team lead to assign a CRM
  'crm_assigned',        // CRM is calling the customer to verify details
  'awaiting_inspection', // CRM verified: genuine, waiting for project manager to assign an inspector
  'invalid',             // CRM marked the lead as wrong / not genuine
  'assigned',            // field inspector assigned
  'scheduled',           // inspector fixed a visit date
  'visited',             // measurements saved, estimate generated
  'estimate_sent',       // estimate link shared with the customer
  'revision_requested',  // customer asked for changes
  'approved',            // customer approved the estimate
  'completed',           // job finished
  'cancelled',
];

// ---- Site measurements: category -> areas (rooms) -> surfaces (wall, ceiling...) ----
const deductionSchema = new Schema({
  label: { type: String, default: 'Door' }, // Door, Window, Ventilator...
  length: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },
}, { _id: false });

const surfaceSchema = new Schema({
  type: { type: String, default: 'Wall' },  // Wall, Ceiling, Roof / Terrace...
  length: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  deductions: [deductionSchema],
  sqft: { type: Number, default: 0 },       // effective sq ft, calculated on the server
  colorCode: { type: String, default: '' },
  photos: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
}, { _id: false });

const areaSchema = new Schema({
  room: { type: String, default: '' },      // Hall, Kitchen, Front elevation...
  name: { type: String, default: '' },      // optional label, e.g. "Bedroom 2"
  surfaces: [surfaceSchema],
  sqft: { type: Number, default: 0 },
}, { _id: false });

const sectionSchema = new Schema({
  category: { type: String, required: true },
  areas: [areaSchema],
  sqft: { type: Number, default: 0 },
}, { _id: false });

// ---- Estimate: total sq ft per category, priced as three options ----
const optionLineSchema = new Schema({
  category: String, label: String, sqft: Number, tier: String, rate: Number, amount: Number,
}, { _id: false });

const optionSchema = new Schema({
  key: String, label: String, interior: String, exterior: String,
  lines: [optionLineSchema], subtotal: Number, gstRate: Number, gst: Number, total: Number,
}, { _id: false });

const appointmentSchema = new Schema(
  {
    refNo: { type: String, unique: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, lowercase: true, trim: true, default: '' },
      mobile: { type: String, required: true, trim: true },
      district: { type: String, enum: [...DISTRICTS, ''], default: '' },
      pincode: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' }, // filled in by CRM on the verification call
    },
    urgency: { type: String, enum: [...URGENCY, ''], default: '' },
    whatsappOptIn: { type: Boolean, default: true },
    preferredDate: Date,
    preferredSlot: { type: String, default: '' },

    status: { type: String, enum: STATUSES, default: 'new', index: true },
    // CRM stage
    assignedCrm: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    crmVerification: {
      result: { type: String, enum: ['waiting_inspection', 'wrong', null], default: null },
      note: { type: String, default: '' },
      at: Date,
      by: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    // Inspection stage (assignedTo = field inspector, the 'manager' role)
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    inspectionAssignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    suggestedManager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    scheduledAt: Date,

    siteVisit: {
      categories: [String],
      sections: [sectionSchema],
      notes: { type: String, default: '' },
      visitedAt: Date,
    },

    estimate: {
      categories: [{ _id: false, category: String, label: String, sqft: Number }],
      totalSqft: Number,
      options: [optionSchema],
      selectedOption: { type: String, default: null }, // set when the customer approves
      total: Number,       // selected option total, or the lowest option until approved
      version: { type: Number, default: 0 },
      generatedAt: Date,
      sentAt: Date,
    },
    publicToken: { type: String, index: true, sparse: true },

    customerResponse: {
      action: { type: String, enum: ['approve', 'revise', null], default: null },
      comment: String,
      option: String,      // option key the customer approved
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
module.exports.TIERS = TIERS;
module.exports.STATUSES = STATUSES;
module.exports.DISTRICTS = DISTRICTS;
module.exports.URGENCY = URGENCY;