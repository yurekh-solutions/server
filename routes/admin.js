// ────────────────────────────────────────────────────────────────────────────
// Admin routes — aggregated stats, list views, and moderation endpoints.
// All endpoints below are protected by adminAuth.
// Response shapes intentionally match the Next.js admin API client in
// urbanav-admin/src/lib/api.ts (typed contracts: OverviewStats,
// RevenueTrendPoint, CategoryStat, TopSupplier, KpiStats, ActivityItem,
// UserListResponse, EquipmentListResponse, OrderListResponse,
// InquiryListResponse, AdminUser, AdminEquipment, AdminOrder, AdminInquiry).
// ────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Equipment = require('../models/Equipment');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');

router.use(adminAuth);

// ── helpers ────────────────────────────────────────────────────────────────
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pct(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function equipmentDerivedStatus(e) {
  if (!e) return 'inactive';
  if (e.availability === false) return 'inactive';
  if ((e.totalBookings ?? 0) === 0 && (e.rating ?? 0) === 0) return 'pending';
  return 'active';
}

function pageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.max(1, Math.min(200, Number(req.query.pageSize) || 50));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      revenueAgg, activeOrders, totalUsers, equipmentCount,
      thisMonthRev, lastMonthRev,
      thisMonthUsers, lastMonthUsers,
      thisMonthEquip, lastMonthEquip,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing', 'delivered'] } }),
      User.countDocuments({}),
      Equipment.countDocuments({}),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
      Equipment.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Equipment.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
    ]);

    const curRev = thisMonthRev[0]?.total || 0;
    const prevRev = lastMonthRev[0]?.total || 0;

    res.json({
      totalRevenue: revenueAgg[0]?.total || 0,
      activeOrders,
      totalUsers,
      equipmentCount,
      deltas: {
        revenuePct: pct(curRev, prevRev),
        usersPct: pct(thisMonthUsers, lastMonthUsers),
        equipmentPct: pct(thisMonthEquip, lastMonthEquip),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/stats/revenue-trend?months=6 → RevenueTrendPoint[]
router.get('/stats/revenue-trend', async (req, res) => {
  try {
    const months = Math.max(1, Math.min(12, Number(req.query.months) || 6));
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - (months - 1));

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          revenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
          },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);

    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const match = rows.find((r) => r._id.y === y && r._id.m === m);
      data.push({
        month: MONTH_LABELS[m - 1],
        revenue: match?.revenue || 0,
        orders: match?.orders || 0,
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/stats/categories → CategoryStat[]
router.get('/stats/categories', async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'equipment',
          localField: 'items.equipmentId',
          foreignField: '_id',
          as: 'eq',
        },
      },
      { $unwind: '$eq' },
      {
        $group: {
          _id: '$eq.category',
          revenue: { $sum: '$items.totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    res.json(
      rows.map((r) => ({
        category: r._id || 'Uncategorized',
        revenue: r.revenue || 0,
        orders: r.orders || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/stats/top-suppliers → TopSupplier[]
router.get('/stats/top-suppliers', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5));
    const rows = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: '$supplierId',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: '$supplier' },
      {
        $project: {
          _id: 0,
          supplierId: '$_id',
          supplierName: { $ifNull: ['$supplier.businessName', '$supplier.name'] },
          orders: 1,
          revenue: 1,
          rating: { $ifNull: ['$supplier.rating', 0] },
        },
      },
    ]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/stats/kpis → KpiStats
router.get('/stats/kpis', async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [avgAgg, totalOrders, cancelled, buyerAgg, repeatAgg] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: since } }),
      Order.countDocuments({ createdAt: { $gte: since }, status: 'cancelled' }),
      Order.aggregate([{ $group: { _id: '$buyerId', n: { $sum: 1 } } }]),
      Order.aggregate([
        { $group: { _id: '$buyerId', n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $count: 'repeat' },
      ]),
    ]);

    const totalBuyers = buyerAgg.length;
    const repeatBuyers = repeatAgg[0]?.repeat || 0;

    res.json({
      avgOrderValue: Math.round(avgAgg[0]?.avg || 0),
      cancellationRate: totalOrders ? Math.round((cancelled / totalOrders) * 1000) / 10 : 0,
      repeatBuyerRate: totalBuyers ? Math.round((repeatBuyers / totalBuyers) * 1000) / 10 : 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/stats/activity → ActivityItem[]
router.get('/stats/activity', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const [orders, users, equipment] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }).limit(limit)
        .populate('buyerId', 'name').select('orderNumber status buyerId createdAt').lean(),
      User.find({}).sort({ createdAt: -1 }).limit(limit)
        .select('name userType createdAt').lean(),
      Equipment.find({}).sort({ createdAt: -1 }).limit(limit)
        .select('name category createdAt').lean(),
    ]);

    const items = [];
    for (const o of orders) {
      const isCancel = o.status === 'cancelled';
      const isDone = o.status === 'delivered' || o.status === 'completed';
      items.push({
        id: `order-${o._id}`,
        kind: 'order',
        title: isCancel ? 'Order cancelled' : isDone ? 'Order delivered' : 'New order placed',
        subtitle: `${o.buyerId?.name || 'Buyer'} · ${o.orderNumber || o._id}`,
        timestamp: o.createdAt,
      });
    }
    for (const u of users) {
      items.push({
        id: `user-${u._id}`,
        kind: 'user',
        title: 'New user registered',
        subtitle: `${u.name} (${u.userType})`,
        timestamp: u.createdAt,
      });
    }
    for (const e of equipment) {
      items.push({
        id: `equipment-${e._id}`,
        kind: 'equipment',
        title: 'Equipment listed',
        subtitle: `${e.name}${e.category ? ` · ${e.category}` : ''}`,
        timestamp: e.createdAt,
      });
    }
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(items.slice(0, limit));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/users → UserListResponse
router.get('/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const { page, pageSize, skip } = pageParams(req);

    const query = {};
    if (role && ['buyer', 'supplier', 'admin'].includes(role)) query.userType = role;
    if (status && ['active', 'suspended', 'pending'].includes(status)) query.accountStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
      ];
    }

    const [rows, total, totalAll, buyersCount, suppliersCount, suspendedCount] = await Promise.all([
      User.find(query)
        .select('name email phone userType accountStatus isVerified createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({}),
      User.countDocuments({ userType: 'buyer' }),
      User.countDocuments({ userType: 'supplier' }),
      User.countDocuments({ accountStatus: 'suspended' }),
    ]);

    // Default accountStatus for legacy docs lacking the field
    const data = rows.map((u) => ({
      ...u,
      accountStatus: u.accountStatus || 'active',
    }));

    res.json({
      data,
      total,
      page,
      pageSize,
      summary: {
        total: totalAll,
        buyers: buyersCount,
        suppliers: suppliersCount,
        suspended: suspendedCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/users/:id/status  { accountStatus: 'active'|'suspended'|'pending' }
router.put('/users/:id/status', async (req, res) => {
  try {
    const { accountStatus } = req.body;
    if (!['active', 'suspended', 'pending'].includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid accountStatus' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true, select: 'name email phone userType accountStatus isVerified createdAt' }
    ).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EQUIPMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/equipment → EquipmentListResponse
router.get('/equipment', async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const { page, pageSize, skip } = pageParams(req);

    const query = {};
    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'inactive') query.availability = false;

    // Over-fetch when status=active/pending so we can filter in JS on derived status.
    const takeMultiplier = status === 'active' || status === 'pending' ? 3 : 1;

    const [items, totalQuery] = await Promise.all([
      Equipment.find(query)
        .populate('supplierId', 'name businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize * takeMultiplier)
        .lean(),
      Equipment.countDocuments(query),
    ]);

    let data = items.map((e) => ({
      _id: e._id,
      name: e.name,
      category: e.category || 'Uncategorized',
      supplier: e.supplierId
        ? {
            _id: e.supplierId._id,
            name: e.supplierId.businessName || e.supplierId.name || 'Unknown',
          }
        : null,
      pricePerDay: e.basePrice || 0,
      availability: e.availability !== false,
      status: equipmentDerivedStatus(e),
      rating: e.rating || 0,
      totalBookings: e.totalBookings || 0,
      createdAt: e.createdAt,
    }));

    if (status === 'active' || status === 'pending') {
      data = data.filter((x) => x.status === status).slice(0, pageSize);
    } else {
      data = data.slice(0, pageSize);
    }

    res.json({ data, total: totalQuery, page, pageSize });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/equipment/:id/availability  { availability: true|false }
router.put('/equipment/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;
    if (typeof availability !== 'boolean') {
      return res.status(400).json({ message: 'availability must be boolean' });
    }
    const e = await Equipment.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    )
      .populate('supplierId', 'name businessName')
      .lean();
    if (!e) return res.status(404).json({ message: 'Equipment not found' });
    res.json({
      _id: e._id,
      name: e.name,
      category: e.category || 'Uncategorized',
      supplier: e.supplierId
        ? {
            _id: e.supplierId._id,
            name: e.supplierId.businessName || e.supplierId.name || 'Unknown',
          }
        : null,
      pricePerDay: e.basePrice || 0,
      availability: e.availability !== false,
      status: equipmentDerivedStatus(e),
      rating: e.rating || 0,
      totalBookings: e.totalBookings || 0,
      createdAt: e.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/orders → OrderListResponse
router.get('/orders', async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, pageSize, skip } = pageParams(req);

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      Order.find(query)
        .populate('buyerId', 'name email')
        .populate('supplierId', 'name businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Order.countDocuments(query),
    ]);

    const data = rows.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber || String(o._id).slice(-6).toUpperCase(),
      buyer: o.buyerId ? { _id: o.buyerId._id, name: o.buyerId.name || 'Unknown' } : null,
      supplier: o.supplierId
        ? { _id: o.supplierId._id, name: o.supplierId.businessName || o.supplierId.name || 'Unknown' }
        : null,
      totalAmount: o.totalAmount || 0,
      status: o.status || 'pending',
      paymentStatus: o.paymentStatus || 'pending',
      createdAt: o.createdAt,
    }));

    res.json({ data, total, page, pageSize });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INQUIRIES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/inquiries → InquiryListResponse
router.get('/inquiries', async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, pageSize, skip } = pageParams(req);

    const query = {};
    // Map admin UI "open" → schema "pending"
    if (status && status !== 'all') {
      const mapped = status === 'open' ? 'pending' : status;
      if (['pending', 'responded', 'accepted', 'rejected'].includes(mapped)) {
        query.status = mapped;
      }
    }

    const [rows, total] = await Promise.all([
      Inquiry.find(query)
        .populate('buyerId', 'name')
        .populate('vendorId', 'name businessName')
        .populate({
          path: 'requirementId',
          select: 'eventType items budget date',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Inquiry.countDocuments(query),
    ]);

    if (search) {
      // Lightweight in-memory filter over populated names
      const s = String(search).toLowerCase();
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const hay = [
          r.buyerId?.name,
          r.vendorId?.name,
          r.vendorId?.businessName,
          r.requirementId?.eventType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(s)) rows.splice(i, 1);
      }
    }

    const data = rows.map((i) => ({
      _id: i._id,
      buyer: i.buyerId ? { _id: i.buyerId._id, name: i.buyerId.name || 'Unknown' } : null,
      supplier: i.vendorId
        ? {
            _id: i.vendorId._id,
            name: i.vendorId.businessName || i.vendorId.name || 'Unknown',
          }
        : null,
      equipment: i.requirementId
        ? {
            _id: i.requirementId._id,
            name: i.requirementId.eventType
              ? `${i.requirementId.eventType} requirement`
              : 'Requirement',
          }
        : null,
      subject: i.requirementId?.eventType
        ? `${i.requirementId.eventType} requirement`
        : 'General inquiry',
      status: i.status === 'pending' ? 'open' : i.status,
      messageCount: (i.counterHistory || []).length,
      createdAt: i.createdAt,
    }));

    res.json({ data, total, page, pageSize });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/vendors — list all suppliers with KYC status
router.get('/vendors', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, search, kycStatus, accountStatus, featured } = req.query;
    const filter = { userType: 'supplier' };

    if (kycStatus && kycStatus !== 'all') {
      const statuses = String(kycStatus).split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        filter.kycStatus = statuses[0];
      } else if (statuses.length > 1) {
        filter.kycStatus = { $in: statuses };
      }
    }
    if (accountStatus && accountStatus !== 'all') filter.accountStatus = accountStatus;
    if (featured === 'true') filter.isFeatured = true;
    if (featured === 'false') filter.isFeatured = false;

    let query = User.find(filter);

    if (search) {
      query = query.or([
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
      ]);
    }

    const total = await User.countDocuments(filter);
    const vendors = await query
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .select('-password');

    const data = vendors.map(v => ({
      id: v._id,
      name: v.name,
      email: v.email,
      phone: v.phone || '',
      businessName: v.businessName || '',
      businessDescription: v.businessDescription || '',
      productsOffered: v.productsOffered || [],
      yearsInBusiness: v.yearsInBusiness || 0,
      gstNumber: v.gstNumber || '',
      panNumber: v.panNumber || '',
      serviceArea: v.serviceArea || { city: '', state: '', pincode: '', fullAddress: '' },
      rating: v.rating || 0,
      isVerified: v.isVerified || false,
      kycStatus: v.kycStatus || 'pending',
      accountStatus: v.accountStatus || 'pending',
      isFeatured: v.isFeatured || false,
      commissionRate: v.commissionRate || 10,
      isFraudFlagged: v.isFraudFlagged || false,
      fraudNotes: v.fraudNotes || '',
      totalOrders: v.totalOrders || 0,
      totalEarnings: v.totalEarnings || 0,
      kycSubmittedAt: v.kycSubmittedAt,
      kycApprovedAt: v.kycApprovedAt,
      kycRejectedAt: v.kycRejectedAt,
      kycRejectionReason: v.kycRejectionReason || '',
      kycDocument: v.kycDocument || null,
      kycDocuments: v.kycDocuments || null,
      createdAt: v.createdAt,
    }));

    res.json({ vendors: data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/vendors/:id — single vendor detail
router.get('/vendors/:id', async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, userType: 'supplier' }).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const equipmentCount = await Equipment.countDocuments({ supplierId: vendor._id });
    const activeOrders = await Order.countDocuments({ supplierId: vendor._id, status: { $in: ['confirmed', 'in_progress'] } });

    res.json({
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone || '',
      businessName: vendor.businessName || '',
      businessDescription: vendor.businessDescription || '',
      productsOffered: vendor.productsOffered || [],
      yearsInBusiness: vendor.yearsInBusiness || 0,
      gstNumber: vendor.gstNumber || '',
      panNumber: vendor.panNumber || '',
      serviceArea: vendor.serviceArea || { city: '', state: '', pincode: '', fullAddress: '' },
      bankDetails: vendor.bankDetails || { accountNumber: '', ifsc: '', bankName: '', accountHolderName: '' },
      rating: vendor.rating || 0,
      isVerified: vendor.isVerified || false,
      kycStatus: vendor.kycStatus || 'pending',
      kycSubmittedAt: vendor.kycSubmittedAt,
      kycApprovedAt: vendor.kycApprovedAt,
      kycRejectedAt: vendor.kycRejectedAt,
      kycRejectionReason: vendor.kycRejectionReason || '',
      accountStatus: vendor.accountStatus || 'pending',
      isFeatured: vendor.isFeatured || false,
      commissionRate: vendor.commissionRate || 10,
      isFraudFlagged: vendor.isFraudFlagged || false,
      fraudNotes: vendor.fraudNotes || '',
      fraudFlaggedAt: vendor.fraudFlaggedAt,
      totalOrders: vendor.totalOrders || 0,
      totalEarnings: vendor.totalEarnings || 0,
      kycDocument: vendor.kycDocument || null,
      kycDocuments: vendor.kycDocuments || null,
      equipmentCount,
      activeOrders,
      createdAt: vendor.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/approve
router.put('/vendors/:id/approve', async (req, res) => {
  try {
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      {
        $set: {
          accountStatus: 'active',
          kycStatus: 'approved',
          kycApprovedAt: new Date(),
          isVerified: true,
        },
      },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor approved', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/reject
router.put('/vendors/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      {
        $set: {
          accountStatus: 'rejected',
          kycStatus: 'rejected',
          kycRejectedAt: new Date(),
          kycRejectionReason: reason || 'No reason provided',
        },
      },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor rejected', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/suspend
router.put('/vendors/:id/suspend', async (req, res) => {
  try {
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      { $set: { accountStatus: 'suspended' } },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor suspended', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/reactivate
router.put('/vendors/:id/reactivate', async (req, res) => {
  try {
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      { $set: { accountStatus: 'active' } },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor reactivated', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/commission
router.put('/vendors/:id/commission', async (req, res) => {
  try {
    const { rate } = req.body;
    if (rate === undefined || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'Commission rate must be between 0 and 100' });
    }
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      { $set: { commissionRate: Number(rate) } },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Commission updated', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/featured
router.put('/vendors/:id/featured', async (req, res) => {
  try {
    const { featured } = req.body;
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      { $set: { isFeatured: !!featured } },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: featured ? 'Vendor featured' : 'Vendor unfeatured', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/fraud-flag
router.put('/vendors/:id/fraud-flag', async (req, res) => {
  try {
    const { notes } = req.body;
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      {
        $set: {
          isFraudFlagged: true,
          fraudNotes: notes || '',
          fraudFlaggedAt: new Date(),
        },
      },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor flagged', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/vendors/:id/fraud-unflag
router.put('/vendors/:id/fraud-unflag', async (req, res) => {
  try {
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'supplier' },
      {
        $set: {
          isFraudFlagged: false,
          fraudNotes: '',
          fraudFlaggedAt: null,
        },
      },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor unflagged', vendor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DISPUTE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/disputes — list orders with disputes
router.get('/disputes', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, status } = req.query;
    const filter = {
      $or: [
        { disputeFlag: true },
        { disputeStatus: { $in: ['open', 'resolved'] } },
      ],
    };
    if (status && status !== 'all') filter.disputeStatus = status;

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('buyerId', 'name email phone')
      .populate('supplierId', 'name email phone businessName')
      .populate('equipmentId', 'name images basePrice')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize));

    const data = orders.map(o => ({
      id: o._id,
      orderId: o._id.toString().slice(-8).toUpperCase(),
      buyer: o.buyerId ? { id: o.buyerId._id, name: o.buyerId.name, email: o.buyerId.email, phone: o.buyerId.phone } : null,
      supplier: o.supplierId ? { id: o.supplierId._id, name: o.supplierId.name, email: o.supplierId.email, phone: o.supplierId.phone, businessName: o.supplierId.businessName } : null,
      equipment: o.equipmentId ? { id: o.equipmentId._id, name: o.equipmentId.name, image: o.equipmentId.images?.[0] || '' } : null,
      totalAmount: o.totalAmount || 0,
      disputeFlag: o.disputeFlag || false,
      disputeStatus: o.disputeStatus || 'open',
      disputeReason: o.disputeReason || '',
      resolution: o.resolution || '',
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    res.json({ disputes: data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/disputes/:id — resolve a dispute
router.put('/disputes/:id', async (req, res) => {
  try {
    const { action, resolution } = req.body;
    const validActions = ['refund', 'no_refund', 'partial_refund', 'dismiss'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be one of: ' + validActions.join(', ') });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          disputeStatus: 'resolved',
          disputeFlag: false,
          resolution: resolution || action,
          resolvedBy: 'admin',
          resolvedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json({ success: true, message: `Dispute resolved with action: ${action}`, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
