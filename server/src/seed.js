// Creates the first super admin + starter rates. Safe to run more than once.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const RateCard = require('./models/RateCard');
const Settings = require('./models/Settings');

// Placeholder all-inclusive rates in ₹ per sq ft (material + labour, before GST).
// Change them any time on the Rate card page.
const RATES = {
  interior: { economy: ['KP Interior Emulsion', 18], premium: ['KP Silk Emulsion', 24], luxury: ['KP Royale Sheen', 32] },
  exterior: { economy: ['KP Exterior Emulsion', 20], premium: ['KP Weathercoat', 28], luxury: ['KP Ultima Shield', 38] },
  texture: { economy: ['KP Texture Basic', 45], premium: ['KP Texture Designer', 65], luxury: ['KP Texture Royale', 90] },
  putty: { flat: ['KP Wall Putty', 12] },
  waterproof: { economy: ['KP Dampguard', 35], premium: ['KP Roof Seal', 50], luxury: ['KP Elastomeric Pro', 70] },
  dampness: { flat: ['KP Damp Treatment', 25] },
  polish_enamel: { economy: ['KP Synthetic Enamel', 40], premium: ['KP Satin Enamel', 60], luxury: ['KP PU Polish', 85] },
  heat_reduction: { economy: ['KP Cool Roof', 30], premium: ['KP Cool Roof Plus', 42], luxury: ['KP Heat Shield', 55] },
};

(async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@keralapaints.com').toLowerCase();
  if (!(await User.findOne({ email }))) {
    await User.create({ name: process.env.ADMIN_NAME || 'Super Admin', email, password: process.env.ADMIN_PASSWORD || 'Admin@123', role: 'superadmin' });
    console.log(`Super admin created: ${email}`);
  } else console.log('Super admin already exists');

  // The old rate card (litres / coverage per surface type) is replaced: drop it if found
  if (await RateCard.exists({ category: { $exists: false } })) {
    await RateCard.collection.drop();
    console.log('Old rate card removed');
  }
  await RateCard.syncIndexes();

  let created = 0;
  for (const [category, tiers] of Object.entries(RATES)) {
    for (const [tier, [productName, rate]] of Object.entries(tiers)) {
      if (await RateCard.exists({ category, tier })) continue;
      await RateCard.create({ category, tier, productName, rate });
      created++;
    }
  }
  console.log(`Rate card rows created: ${created}`);

  await Settings.getGlobal();
  console.log('Settings ready');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});