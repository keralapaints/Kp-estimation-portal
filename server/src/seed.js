// Creates the first super admin + a starter rate card. Safe to run more than once.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const RateCard = require('./models/RateCard');
const Settings = require('./models/Settings');

// Placeholder products and prices (INR, before GST). Edit from the Rate card screen.
// [productName, paintCoverage sqft/L/coat, paintPrice/L, labourRate/sqft]
const PRODUCTS = {
  interior: {
    economy: ['KP Interior Emulsion', 120, 220, 12],
    premium: ['KP Silk Emulsion', 140, 380, 15],
    luxury: ['KP Royale Sheen', 150, 620, 18],
  },
  exterior: {
    economy: ['KP Exterior Emulsion', 70, 260, 14],
    premium: ['KP Weathercoat', 80, 420, 17],
    luxury: ['KP Ultima Shield', 90, 650, 20],
  },
  waterproofing: {
    economy: ['KP Dampguard', 40, 300, 15],
    premium: ['KP Roof Seal', 40, 450, 18],
    luxury: ['KP Elastomeric Pro', 45, 700, 22],
  },
  wood: {
    economy: ['KP Synthetic Enamel', 100, 350, 20],
    premium: ['KP Satin Enamel', 90, 550, 25],
    luxury: ['KP PU Wood Finish', 80, 900, 35],
  },
  metal: {
    economy: ['KP Metal Enamel', 110, 300, 15],
    premium: ['KP Gloss Enamel', 110, 450, 18],
    luxury: ['KP Anti-rust Premium', 110, 700, 22],
  },
};

const EXTRAS = {
  interior: { primerName: 'KP Interior Primer', primerCoverage: 100, primerPrice: 180, puttyName: 'KP Wall Putty', puttyCoverage: 15, puttyPrice: 30 },
  exterior: { primerName: 'KP Exterior Primer', primerCoverage: 70, primerPrice: 220, puttyCoverage: 0, puttyPrice: 0 },
  waterproofing: { primerName: 'Waterproof basecoat', primerCoverage: 60, primerPrice: 250, puttyCoverage: 0, puttyPrice: 0 },
  wood: { primerName: 'KP Wood Primer', primerCoverage: 110, primerPrice: 250, puttyCoverage: 0, puttyPrice: 0 },
  metal: { primerName: 'KP Red Oxide Primer', primerCoverage: 100, primerPrice: 200, puttyCoverage: 0, puttyPrice: 0 },
};

(async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@keralapaints.com').toLowerCase();
  if (!(await User.findOne({ email }))) {
    await User.create({
      name: process.env.ADMIN_NAME || 'Super Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'superadmin',
    });
    console.log(`Super admin created: ${email}`);
  } else console.log('Super admin already exists');

  let created = 0;
  for (const [surfaceType, tiers] of Object.entries(PRODUCTS)) {
    for (const [tier, [productName, paintCoverage, paintPrice, labourRate]] of Object.entries(tiers)) {
      const exists = await RateCard.findOne({ surfaceType, tier });
      if (exists) continue;
      await RateCard.create({ surfaceType, tier, productName, paintCoverage, paintPrice, labourRate, defaultCoats: 2, ...EXTRAS[surfaceType] });
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
