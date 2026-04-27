// ─────────────────────────────────────────────────────────────────────────────
// seedAdmin.js — comprehensive seed for the Admin Dashboard.
// Wipes and repopulates: users (admin + suppliers + buyers with various
// accountStatus), equipment (representative catalogue), requirements,
// inquiries, and orders spread across the last 6 months so the Analytics /
// Dashboard charts show real trends.
//
// Run:  node scripts/seedAdmin.js     (from the server/ folder)
// Or:   npm run seed:admin
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
require('dotenv').config();

const User        = require('../models/User');
const Equipment   = require('../models/Equipment');
const Order       = require('../models/Order');
const Requirement = require('../models/Requirement');
const Inquiry     = require('../models/Inquiry');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const pick   = (arr)      => arr[Math.floor(Math.random() * arr.length)];
const rand   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d)       => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// USERS — 1 admin + 4 suppliers + 10 buyers (mixed account statuses)
// ─────────────────────────────────────────────────────────────────────────────
const admins = [
  {
    email: 'admin@urbanav.com',
    password: 'admin12345',
    name: 'Urbanav Admin',
    phone: '+911111111111',
    userType: 'admin',
    isVerified: true,
    accountStatus: 'active',
  },
];

const suppliers = [
  {
    email: 'proav@urbanav.com', password: 'password123', name: 'ProAV Solutions',
    phone: '+919876543210', userType: 'supplier', businessName: 'ProAV Solutions',
    businessDescription: 'Premium projectors, LED walls, and screens',
    isVerified: true, accountStatus: 'active',
    rating: 4.7, totalOrders: 0, totalEarnings: 0,
  },
  {
    email: 'soundmaster@urbanav.com', password: 'password123', name: 'SoundMaster Events',
    phone: '+919876543211', userType: 'supplier', businessName: 'SoundMaster Events',
    businessDescription: 'Professional sound systems and microphones',
    isVerified: true, accountStatus: 'active',
    rating: 4.5, totalOrders: 0, totalEarnings: 0,
  },
  {
    email: 'djpro@urbanav.com', password: 'password123', name: 'DJ Pro Rentals',
    phone: '+919876543212', userType: 'supplier', businessName: 'DJ Pro Rentals',
    businessDescription: 'DJ equipment and stage lighting',
    isVerified: true, accountStatus: 'active',
    rating: 4.8, totalOrders: 0, totalEarnings: 0,
  },
  {
    email: 'techvision@urbanav.com', password: 'password123', name: 'TechVision',
    phone: '+919876543213', userType: 'supplier', businessName: 'TechVision',
    businessDescription: 'Video recording and cables & accessories',
    isVerified: true, accountStatus: 'pending', // awaiting approval
    rating: 0, totalOrders: 0, totalEarnings: 0,
  },
];

const buyers = [
  { name: 'Rahul Sharma',   email: 'rahul@test.com',    phone: '+919811100001', accountStatus: 'active',    isVerified: true  },
  { name: 'Priya Nair',     email: 'priya@test.com',    phone: '+919811100002', accountStatus: 'active',    isVerified: true  },
  { name: 'Arjun Mehta',    email: 'arjun@test.com',    phone: '+919811100003', accountStatus: 'active',    isVerified: true  },
  { name: 'Sneha Kapoor',   email: 'sneha@test.com',    phone: '+919811100004', accountStatus: 'active',    isVerified: true  },
  { name: 'Vikram Singh',   email: 'vikram@test.com',   phone: '+919811100005', accountStatus: 'active',    isVerified: true  },
  { name: 'Ananya Iyer',    email: 'ananya@test.com',   phone: '+919811100006', accountStatus: 'active',    isVerified: true  },
  { name: 'Karan Malhotra', email: 'karan@test.com',    phone: '+919811100007', accountStatus: 'suspended', isVerified: true  },
  { name: 'Divya Rao',      email: 'divya@test.com',    phone: '+919811100008', accountStatus: 'pending',   isVerified: false },
  { name: 'Rohit Verma',    email: 'rohit@test.com',    phone: '+919811100009', accountStatus: 'active',    isVerified: true  },
  { name: 'Test Buyer',     email: 'buyer@test.com',    phone: '+919876543214', accountStatus: 'active',    isVerified: true  },
].map((b) => ({ ...b, password: 'password123', userType: 'buyer' }));

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT — compact catalogue covering most categories
// ─────────────────────────────────────────────────────────────────────────────
const equipmentCatalog = [
  // projectors
  { name: 'Epson EB-FH52 Full HD',            category: 'projectors',         subcategory: 'HD Projectors',      description: 'Full HD 1080p, 4000 lumens',    basePrice: 2500,  minPrice: 1800, maxPrice: 3200,  popular: true,  rating: 4.6, totalBookings: 24, specs: ['4000 Lumens','Full HD'], tags: ['projector','hd'] },
  { name: 'BenQ TK700STi 4K',                 category: 'projectors',         subcategory: '4K Projectors',      description: 'True 4K UHD HDR projector',      basePrice: 4500,  minPrice: 3500, maxPrice: 6000,  popular: true,  rating: 4.8, totalBookings: 18, specs: ['4K UHD','HDR10'],        tags: ['projector','4k'] },
  { name: 'Panasonic PT-RZ990 Laser',         category: 'projectors',         subcategory: 'Large Venue',        description: 'Professional 9400 lumens laser', basePrice: 15000, minPrice: 12000, maxPrice: 20000, popular: false, rating: 4.9, totalBookings: 7,  specs: ['9400 Lumens','Laser'],   tags: ['projector','concert'] },

  // led-walls
  { name: 'P2.5 Indoor LED Wall (1sqm)',      category: 'led-walls',          subcategory: 'Indoor LED P2',      description: 'High-res P2.5 LED wall',          basePrice: 3500,  minPrice: 2500, maxPrice: 5000,  popular: true,  rating: 4.7, totalBookings: 15, specs: ['P2.5'],                  tags: ['led wall'] },
  { name: 'P3.91 Outdoor LED Wall (1sqm)',    category: 'led-walls',          subcategory: 'Outdoor LED',        description: 'Weatherproof outdoor LED wall',   basePrice: 4500,  minPrice: 3500, maxPrice: 6000,  popular: true,  rating: 4.6, totalBookings: 12, specs: ['IP65'],                  tags: ['led wall','outdoor'] },

  // sound-systems
  { name: 'Standard PA System (500W)',        category: 'sound-systems',      subcategory: 'PA Systems',         description: 'Powerful 500W PA system',         basePrice: 3500,  minPrice: 2500, maxPrice: 5000,  popular: true,  rating: 4.5, totalBookings: 30, specs: ['500W','Mixer'],          tags: ['pa'] },
  { name: 'Line Array System (2000W)',        category: 'sound-systems',      subcategory: 'Line Array',         description: 'Concert-grade line array',        basePrice: 15000, minPrice: 12000, maxPrice: 25000, popular: false, rating: 4.9, totalBookings: 6,  specs: ['2000W'],                 tags: ['line array'] },
  { name: 'JBL EON615 Portable Pair',         category: 'sound-systems',      subcategory: 'Portable Speakers',  description: 'Premium portable speakers',       basePrice: 3000,  minPrice: 2200, maxPrice: 4500,  popular: true,  rating: 4.4, totalBookings: 20, specs: ['1000W'],                 tags: ['speaker','jbl'] },

  // microphones
  { name: 'Shure SM58 Wireless',              category: 'microphones',        subcategory: 'Wireless Handheld',  description: 'Industry-standard wireless mic',  basePrice: 1200,  minPrice: 800,  maxPrice: 2000,  popular: true,  rating: 4.8, totalBookings: 45, specs: ['UHF'],                   tags: ['shure','wireless'] },
  { name: 'Karaoke Mic Set (2 Wireless)',     category: 'microphones',        subcategory: 'Karaoke Mics',       description: 'Party karaoke mic pair',          basePrice: 1500,  minPrice: 1000, maxPrice: 2500,  popular: true,  rating: 4.3, totalBookings: 22, specs: ['Echo'],                  tags: ['karaoke'] },

  // dj-equipment
  { name: 'Pioneer DDJ-FLX4 Controller',      category: 'dj-equipment',       subcategory: 'DJ Controllers',     description: 'Entry-level Pioneer DJ controller', basePrice: 2500, minPrice: 1800, maxPrice: 3500,  popular: true,  rating: 4.5, totalBookings: 28, specs: ['2 Ch','rekordbox'],      tags: ['dj','pioneer'] },
  { name: 'Complete DJ Package',              category: 'dj-equipment',       subcategory: 'DJ Packages',        description: 'Controller + speakers bundle',    basePrice: 8000,  minPrice: 6000, maxPrice: 12000, popular: true,  rating: 4.7, totalBookings: 14, specs: ['Package'],               tags: ['dj','package'] },

  // lighting
  { name: 'LED PAR Can (RGBW)',               category: 'lighting',           subcategory: 'PAR Lights',         description: 'RGBW LED PAR for stage',          basePrice: 800,   minPrice: 500,  maxPrice: 1200,  popular: false, rating: 4.2, totalBookings: 35, specs: ['RGBW','DMX'],            tags: ['light','par'] },
  { name: 'Moving Head Beam 7R',              category: 'lighting',           subcategory: 'Moving Heads',       description: 'Powerful moving head',            basePrice: 3000,  minPrice: 2000, maxPrice: 4500,  popular: true,  rating: 4.6, totalBookings: 16, specs: ['230W'],                  tags: ['light','moving head'] },
  { name: 'Fog Machine 1500W',                category: 'lighting',           subcategory: 'Fog Machines',       description: 'Create atmospheric fog',          basePrice: 1500,  minPrice: 1000, maxPrice: 2500,  popular: false, rating: 4.1, totalBookings: 18, specs: ['1500W'],                 tags: ['fog'] },

  // video-recording
  { name: 'Sony A7 IV 4K Camera',             category: 'video-recording',    subcategory: '4K Cameras',         description: 'Professional mirrorless 4K',      basePrice: 5000,  minPrice: 4000, maxPrice: 7000,  popular: true,  rating: 4.9, totalBookings: 11, specs: ['33MP','4K 60fps'],       tags: ['sony','camera'] },
  { name: 'Live Streaming Package',           category: 'video-recording',    subcategory: 'Recording Packages', description: 'Complete live streaming setup',   basePrice: 10000, minPrice: 8000, maxPrice: 15000, popular: false, rating: 4.7, totalBookings: 5,  specs: ['Camera','Switcher'],     tags: ['streaming'] },

  // cables-accessories
  { name: 'HDMI Cable (10m)',                 category: 'cables-accessories', subcategory: 'HDMI Cables',        description: 'Long HDMI cable',                 basePrice: 400,   minPrice: 250,  maxPrice: 700,   popular: false, rating: 4.0, totalBookings: 50, specs: ['10m','4K'],              tags: ['hdmi'] },
  { name: 'Speaker Stand (Pair)',             category: 'cables-accessories', subcategory: 'Stands',             description: 'Pro speaker stands w/ bag',       basePrice: 800,   minPrice: 500,  maxPrice: 1200,  popular: false, rating: 4.2, totalBookings: 25, specs: ['Pair','35mm'],           tags: ['stand'] },

  // screens
  { name: 'Fast Fold Screen 10x8 feet',       category: 'screens',            subcategory: 'Fast Fold Screens',  description: 'Pro fast-fold event screen',      basePrice: 2500,  minPrice: 1800, maxPrice: 3500,  popular: true,  rating: 4.5, totalBookings: 19, specs: ['10x8','Front/Rear'],     tags: ['screen'] },

  // led-tvs — inactive example
  { name: 'Samsung 55" 4K LED TV',            category: 'led-tvs',            subcategory: 'Event TVs',          description: '55" 4K UHD display for venues',   basePrice: 1800,  minPrice: 1200, maxPrice: 2500,  popular: false, rating: 0,   totalBookings: 0,  specs: ['55"','4K UHD'],          tags: ['tv','samsung'] },
];

// Category → supplier mapping
function supplierForCategory(category, s) {
  if (['projectors', 'led-walls', 'led-tvs', 'screens'].includes(category)) return s.proAV;
  if (['sound-systems', 'microphones'].includes(category))                   return s.soundMaster;
  if (['dj-equipment', 'lighting'].includes(category))                        return s.djPro;
  return s.techVision;
}

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivered', 'completed', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'failed'];

// ─────────────────────────────────────────────────────────────────────────────
// Build orders spread across last 180 days
// ─────────────────────────────────────────────────────────────────────────────
function buildOrder(buyer, equipment) {
  const qty         = rand(1, 3);
  const pricePerUnit = equipment.basePrice;
  const totalPrice  = qty * pricePerUnit;
  const eventDate   = daysAgo(rand(0, 180));
  const returnDate  = new Date(eventDate.getTime() + rand(1, 3) * 24 * 60 * 60 * 1000);
  const status      = pick(ORDER_STATUSES);
  const paymentStatus =
    status === 'completed' || status === 'delivered' ? 'paid'
    : status === 'cancelled'                         ? pick(['refunded', 'failed'])
    : pick(['pending', 'paid']);

  return {
    buyerId:    buyer._id,
    supplierId: equipment.supplierId,
    items: [{
      equipmentId: equipment._id,
      name:        equipment.name,
      image:       equipment.images?.[0] || '',
      quantity:    qty,
      pricePerUnit,
      totalPrice,
      eventDate,
      returnDate,
    }],
    status,
    totalAmount:   totalPrice,
    paymentStatus,
    paymentMethod: pick(['stripe', 'razorpay', 'upi', 'cash']),
    deliveryAddress: {
      street:   'Flat 203, Tower B',
      city:     pick(['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad']),
      state:    pick(['MH', 'DL', 'KA', 'TS']),
      pincode:  String(rand(100000, 999999)),
    },
    notes:       '',
    advanceAmount: Math.round(totalPrice * 0.2),
    advancePaid:   ['confirmed', 'preparing', 'delivered', 'completed'].includes(status),
    balanceDue:    status === 'completed' ? 0 : Math.round(totalPrice * 0.8),
    createdAt:     daysAgo(rand(0, 180)),
    updatedAt:     new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirements + Inquiries (for admin Inquiries page)
// ─────────────────────────────────────────────────────────────────────────────
const EVENT_TYPES = ['Corporate', 'Wedding', 'Personal', 'Exhibition', 'Concert', 'Conference'];
const BUDGET_BANDS = ['₹10K-25K', '₹25K-50K', '₹50K-1L', '₹1L+', 'Flexible'];
const CITIES       = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'];

function buildRequirement(buyer) {
  const createdAt = daysAgo(rand(0, 90));
  const startAt   = new Date(createdAt.getTime() + rand(5, 30) * 24 * 60 * 60 * 1000);
  const endAt     = new Date(startAt.getTime() + rand(1, 3) * 24 * 60 * 60 * 1000);
  return {
    buyerId: buyer._id,
    location: {
      address: `${rand(1, 500)} Main Rd`,
      city:    pick(CITIES),
    },
    eventType: pick(EVENT_TYPES),
    startAt,
    endAt,
    items: [pick(['projectors', 'sound-systems', 'led-walls', 'dj-equipment', 'microphones'])],
    budget: pick(BUDGET_BANDS),
    notes:  '',
    status: pick(['open', 'matched', 'booked']),
    createdAt,
    updatedAt: new Date(),
  };
}

function buildInquiry(requirement, vendor) {
  const status = pick(['pending', 'responded', 'accepted', 'rejected']);
  const quotedPrice = rand(5000, 80000);
  const history = [];

  history.push({
    from: 'buyer',
    kind: 'message',
    text: 'Hi, interested in your equipment for our event.',
    at:   requirement.createdAt,
  });
  if (status !== 'pending') {
    history.push({
      from:  'vendor',
      kind:  'quote',
      text:  `We can offer a package at ₹${quotedPrice}`,
      price: quotedPrice,
      at:    new Date(requirement.createdAt.getTime() + 60 * 60 * 1000),
    });
  }
  if (status === 'accepted') {
    history.push({
      from: 'buyer',
      kind: 'accept',
      text: 'Accepted. Please proceed.',
      at:   new Date(requirement.createdAt.getTime() + 2 * 60 * 60 * 1000),
    });
  }

  return {
    requirementId: requirement._id,
    buyerId:       requirement.buyerId,
    vendorId:      vendor._id,
    status,
    quotedPrice: status === 'pending' ? undefined : quotedPrice,
    counterHistory: history,
    createdAt: requirement.createdAt,
    updatedAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing data…');
    await Promise.all([
      User.deleteMany({}),
      Equipment.deleteMany({}),
      Order.deleteMany({}),
      Requirement.deleteMany({}),
      Inquiry.deleteMany({}),
    ]);

    // Users — use .create() (not insertMany) so password pre-save hook hashes each password.
    console.log('👥 Creating users…');
    const createdAdmins    = await Promise.all(admins.map((u)    => User.create(u)));
    const createdSuppliers = await Promise.all(suppliers.map((u) => User.create(u)));
    const createdBuyers    = await Promise.all(buyers.map((u)    => User.create(u)));
    console.log(`   ${createdAdmins.length} admin(s), ${createdSuppliers.length} supplier(s), ${createdBuyers.length} buyer(s)`);

    const supplierMap = {
      proAV:       createdSuppliers.find((u) => u.businessName === 'ProAV Solutions'),
      soundMaster: createdSuppliers.find((u) => u.businessName === 'SoundMaster Events'),
      djPro:       createdSuppliers.find((u) => u.businessName === 'DJ Pro Rentals'),
      techVision:  createdSuppliers.find((u) => u.businessName === 'TechVision'),
    };

    // Equipment
    console.log('📦 Creating equipment…');
    // NOTE: the mobile app prefers locally bundled images for known categories,
    // so the URL we store here is only used as a last-resort fallback. We use
    // picsum.photos (seeded by name) which is reliable across networks — do
    // NOT use via.placeholder.com: it is commonly DNS-blocked / offline.
    const equipmentDocs = equipmentCatalog.map((item) => {
      const seed = encodeURIComponent(item.name.toLowerCase().replace(/\s+/g, '-'));
      return {
        ...item,
        priceUnit:   'day',
        images:      [`https://picsum.photos/seed/${seed}/600/400`],
        availability: item.rating === 0 && item.totalBookings === 0 ? false : true, // one "inactive" example
        quantity:    rand(1, 5),
        supplierId:  supplierForCategory(item.category, supplierMap)._id,
        createdAt:   daysAgo(rand(30, 180)),
      };
    });
    const createdEquipment = await Equipment.insertMany(equipmentDocs);
    console.log(`   ${createdEquipment.length} items`);

    // Active buyers only place orders / requirements
    const activeBuyers = createdBuyers.filter((b) => b.accountStatus === 'active');

    // Orders — 40 spread across 6 months
    console.log('🛒 Creating orders…');
    const ordersToCreate = [];
    for (let i = 0; i < 40; i++) {
      ordersToCreate.push(buildOrder(pick(activeBuyers), pick(createdEquipment)));
    }
    // Use .create() one by one so the pre-save hook assigns an orderNumber per doc.
    const createdOrders = [];
    for (const o of ordersToCreate) {
      createdOrders.push(await Order.create(o));
    }
    console.log(`   ${createdOrders.length} orders`);

    // Update supplier totals based on completed/delivered orders
    const supplierAgg = new Map();
    for (const o of createdOrders) {
      if (!['completed', 'delivered'].includes(o.status)) continue;
      const key = String(o.supplierId);
      const prev = supplierAgg.get(key) || { count: 0, revenue: 0 };
      prev.count   += 1;
      prev.revenue += o.totalAmount;
      supplierAgg.set(key, prev);
    }
    await Promise.all(
      Array.from(supplierAgg.entries()).map(([id, { count, revenue }]) =>
        User.updateOne({ _id: id }, { $set: { totalOrders: count, totalEarnings: revenue } })
      )
    );

    // Requirements + Inquiries
    console.log('📝 Creating requirements & inquiries…');
    const requirementDocs = activeBuyers.flatMap((b) =>
      Array.from({ length: rand(1, 2) }, () => buildRequirement(b))
    );
    const createdReqs = await Requirement.insertMany(requirementDocs);

    const inquiryDocs = [];
    for (const req of createdReqs) {
      const count = rand(1, 2);
      for (let i = 0; i < count; i++) {
        const vendor = pick([supplierMap.proAV, supplierMap.soundMaster, supplierMap.djPro]);
        inquiryDocs.push(buildInquiry(req, vendor));
      }
    }
    const createdInquiries = await Inquiry.insertMany(inquiryDocs);
    console.log(`   ${createdReqs.length} requirements, ${createdInquiries.length} inquiries`);

    console.log('\n✅ Seed complete!');
    console.log('\n📝 Test credentials:');
    console.log('   Admin:     admin@urbanav.com        / admin12345');
    console.log('   Supplier:  proav@urbanav.com        / password123');
    console.log('   Supplier:  soundmaster@urbanav.com  / password123');
    console.log('   Supplier:  djpro@urbanav.com        / password123');
    console.log('   Supplier:  techvision@urbanav.com   / password123  (pending)');
    console.log('   Buyer:     buyer@test.com           / password123');
    console.log('   Buyer:     rahul@test.com           / password123');
    console.log('   … (and 8 more buyers — 1 suspended, 1 pending)\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

run();
