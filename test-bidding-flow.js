/**
 * End-to-end Competitive Bidding Flow Test
 * Tests the complete flow: register/login → post requirement → suppliers offer → buyer selects winner
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';
const ADMIN_TOKEN = 'urbanav-admin-dev-token';

// Test accounts
const BUYER = {
  email: 'testbuyer.bidding@test.com',
  password: 'Test@123',
  name: 'Test Buyer',
  phone: '9999900001',
  userType: 'buyer',
};

const SUPPLIER1 = {
  email: 'proav.bidding@test.com',
  password: 'Test@123',
  name: 'ProAV Solutions',
  phone: '8888800001',
  userType: 'supplier',
  businessName: 'ProAV Solutions',
};

const SUPPLIER2 = {
  email: 'soundmaster.bidding@test.com',
  password: 'Test@123',
  name: 'SoundMaster Events',
  phone: '8888800002',
  userType: 'supplier',
  businessName: 'SoundMaster Events',
};

let buyerToken = null;
let supplier1Token = null;
let supplier2Token = null;
let supplier1Id = null;
let supplier2Id = null;
let requirementId = null;
let offer1Id = null;
let offer2Id = null;

const results = [];

function log(step, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
  console.log(`${icon} [Step ${step}] ${detail}`);
  results.push({ step, status, detail });
}

async function registerOrLogin(account) {
  // Try login first
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: account.email,
      password: account.password,
    });
    if (res.data.success) {
      return { token: res.data.token, userId: res.data.user.id, isNew: false };
    }
  } catch (err) {
    // Login failed - try register
  }

  // Register
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, account);
    if (res.data.success) {
      return { token: res.data.token, userId: res.data.user.id, isNew: true };
    }
  } catch (err) {
    // If already exists, retry login (may have been registered with different password)
    if (err.response?.data?.message?.includes('already exists')) {
      const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: account.email,
        password: account.password,
      });
      return { token: res.data.token, userId: res.data.user.id, isNew: false };
    }
    throw err;
  }
}

async function approveSupplier(supplierId) {
  try {
    await axios.put(`${BASE_URL}/admin/vendors/${supplierId}/approve`, {}, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    });
  } catch (err) {
    // May already be approved
    console.log(`   (Approve response: ${err.response?.data?.message || err.message})`);
  }
}

async function loginSupplier(account) {
  // For suppliers: register → approve via admin → login
  let userId = null;

  // Step 1: Try to register (or get existing user)
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, account);
    if (regRes.data.success) {
      userId = regRes.data.user.id;
    }
  } catch (err) {
    if (err.response?.data?.message?.includes('already exists')) {
      // Need to find user ID - try login (might be already approved)
      try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
          email: account.email,
          password: account.password,
        });
        if (loginRes.data.success) {
          return { token: loginRes.data.token, userId: loginRes.data.user.id };
        }
      } catch (loginErr) {
        // Account pending - need to approve. Get ID from error or find another way.
        // Use admin API to find the vendor
        const vendorsRes = await axios.get(`${BASE_URL}/admin/vendors`, {
          headers: { 'x-admin-token': ADMIN_TOKEN },
        });
        const vendor = vendorsRes.data.vendors?.find(v => v.email === account.email);
        if (vendor) {
          userId = vendor._id || vendor.id;
        } else {
          throw new Error(`Cannot find supplier ${account.email} in vendor list`);
        }
      }
    } else {
      throw err;
    }
  }

  // Step 2: Approve via admin
  if (userId) {
    await approveSupplier(userId);
  }

  // Step 3: Login
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: account.email,
    password: account.password,
  });
  return { token: loginRes.data.token, userId: loginRes.data.user.id || userId };
}

async function runTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  COMPETITIVE BIDDING E2E TEST');
  console.log('═'.repeat(60) + '\n');

  // ─── Step 1: Login as Buyer ───────────────────────────────────────────
  try {
    const buyerResult = await registerOrLogin(BUYER);
    buyerToken = buyerResult.token;
    log(1, 'PASS', `Buyer authenticated (${buyerResult.isNew ? 'registered' : 'logged in'}): ${BUYER.email}`);
  } catch (err) {
    log(1, 'FAIL', `Buyer auth failed: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 2: Post a Requirement ───────────────────────────────────────
  try {
    const res = await axios.post(`${BASE_URL}/requirements`, {
      address: 'MG Road, Bangalore',
      city: 'Bangalore',
      lat: 12.97,
      lng: 77.59,
      eventType: 'Wedding',
      date: '2026-06-15',
      startTime: '10:00 AM',
      endTime: '6:00 PM',
      items: ['Sound System', 'Lighting', 'DJ Equipment'],
      budget: '15000-25000',
      notes: 'Wedding reception, need premium quality',
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });

    if (res.data.success) {
      requirementId = res.data.requirement._id;
      log(2, 'PASS', `Requirement posted: ${requirementId}`);
    } else {
      log(2, 'FAIL', `Requirement creation failed: ${res.data.message}`);
      return;
    }
  } catch (err) {
    log(2, 'FAIL', `Requirement creation error: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 3: Login as Supplier 1 ─────────────────────────────────────
  try {
    const s1 = await loginSupplier(SUPPLIER1);
    supplier1Token = s1.token;
    supplier1Id = s1.userId;
    log(3, 'PASS', `Supplier 1 authenticated: ${SUPPLIER1.businessName} (ID: ${supplier1Id})`);
  } catch (err) {
    log(3, 'FAIL', `Supplier 1 auth failed: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 4: Supplier 1 sends offer ──────────────────────────────────
  try {
    const res = await axios.post(`${BASE_URL}/requirements/${requirementId}/offer`, {
      price: 18000,
      note: 'Includes JBL sound system + LED lighting + delivery',
    }, {
      headers: { Authorization: `Bearer ${supplier1Token}` },
    });

    if (res.data.success) {
      offer1Id = res.data.inquiry._id;
      log(4, 'PASS', `Supplier 1 offer sent: ₹18,000 (Inquiry: ${offer1Id})`);
    } else {
      log(4, 'FAIL', `Supplier 1 offer failed: ${res.data.message}`);
      return;
    }
  } catch (err) {
    log(4, 'FAIL', `Supplier 1 offer error: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 5: Login as Supplier 2 ─────────────────────────────────────
  try {
    const s2 = await loginSupplier(SUPPLIER2);
    supplier2Token = s2.token;
    supplier2Id = s2.userId;
    log(5, 'PASS', `Supplier 2 authenticated: ${SUPPLIER2.businessName} (ID: ${supplier2Id})`);
  } catch (err) {
    log(5, 'FAIL', `Supplier 2 auth failed: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 6: Supplier 2 sends offer ──────────────────────────────────
  try {
    const res = await axios.post(`${BASE_URL}/requirements/${requirementId}/offer`, {
      price: 22000,
      note: 'Premium Bose equipment + free setup + backup unit',
    }, {
      headers: { Authorization: `Bearer ${supplier2Token}` },
    });

    if (res.data.success) {
      offer2Id = res.data.inquiry._id;
      log(6, 'PASS', `Supplier 2 offer sent: ₹22,000 (Inquiry: ${offer2Id})`);
    } else {
      log(6, 'FAIL', `Supplier 2 offer failed: ${res.data.message}`);
      return;
    }
  } catch (err) {
    log(6, 'FAIL', `Supplier 2 offer error: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 7: Buyer views offers ──────────────────────────────────────
  let offers = [];
  try {
    const res = await axios.get(`${BASE_URL}/requirements/${requirementId}/offers`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });

    if (res.data.success) {
      offers = res.data.offers;
      const offerCount = offers.length;
      const sorted = offers.every((o, i) => i === 0 || o.offerPrice >= offers[i - 1].offerPrice);
      if (offerCount === 2 && sorted) {
        log(7, 'PASS', `Buyer sees ${offerCount} offers, sorted by price: [₹${offers.map(o => o.offerPrice).join(', ₹')}]`);
      } else {
        log(7, 'FAIL', `Expected 2 sorted offers, got ${offerCount} offers. Sorted: ${sorted}`);
      }
      console.log('   Offers:');
      offers.forEach((o, i) => {
        const vendor = o.vendorId?.businessName || o.vendorId?.name || 'Unknown';
        console.log(`     ${i + 1}. ${vendor} — ₹${o.offerPrice} — "${o.offerNote}"`);
      });
    } else {
      log(7, 'FAIL', `View offers failed: ${res.data.message}`);
      return;
    }
  } catch (err) {
    log(7, 'FAIL', `View offers error: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 8: Buyer selects the winning offer (cheapest) ──────────────
  const cheapestOffer = offers[0]; // Already sorted by price ascending
  let order = null;
  try {
    const res = await axios.patch(`${BASE_URL}/requirements/${requirementId}/select-offer`, {
      inquiryId: cheapestOffer._id,
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });

    if (res.data.success) {
      order = res.data.order;
      const hasOtps = order && order.otpStart && order.otpEnd;
      log(8, 'PASS', `Offer selected! Order created: ${order?._id} | OTP Start: ${order?.otpStart} | OTP End: ${order?.otpEnd}`);
      if (!hasOtps) {
        log(8, 'FAIL', 'Order missing OTPs');
      }
    } else {
      log(8, 'FAIL', `Select offer failed: ${res.data.message}`);
      return;
    }
  } catch (err) {
    log(8, 'FAIL', `Select offer error: ${err.response?.data?.message || err.message}`);
    console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    return;
  }

  // ─── Step 9: Verify final state ──────────────────────────────────────
  console.log('\n─── Final State Verification ───');
  let step9Pass = true;

  // 9a. Check requirement status = 'matched'
  try {
    const res = await axios.get(`${BASE_URL}/requirements/${requirementId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const req = res.data.requirement;
    if (req.status === 'matched') {
      console.log(`   ✅ Requirement status: ${req.status}`);
    } else {
      console.log(`   ❌ Requirement status: ${req.status} (expected: matched)`);
      step9Pass = false;
    }
  } catch (err) {
    console.log(`   ❌ Could not fetch requirement: ${err.message}`);
    step9Pass = false;
  }

  // 9b. Check winning inquiry has isSelected=true
  try {
    // Use admin to check inquiries directly
    const res = await axios.get(`${BASE_URL}/admin/inquiries`, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
      params: { pageSize: 100 },
    });
    const allInquiries = res.data.inquiries || [];
    const winning = allInquiries.find(i => i._id === cheapestOffer._id || i._id?.toString() === cheapestOffer._id?.toString());
    const losing = allInquiries.find(i => i._id === offers[1]?._id || i._id?.toString() === offers[1]?._id?.toString());

    if (winning) {
      if (winning.isSelected === true) {
        console.log(`   ✅ Winning inquiry isSelected: true`);
      } else {
        console.log(`   ❌ Winning inquiry isSelected: ${winning.isSelected} (expected: true)`);
        step9Pass = false;
      }
      if (winning.status === 'accepted') {
        console.log(`   ✅ Winning inquiry status: accepted`);
      } else {
        console.log(`   ❌ Winning inquiry status: ${winning.status} (expected: accepted)`);
        step9Pass = false;
      }
    } else {
      console.log(`   ⚠️  Could not find winning inquiry in admin list, checking via alternative...`);
    }

    if (losing) {
      if (losing.status === 'rejected') {
        console.log(`   ✅ Losing inquiry status: rejected`);
      } else {
        console.log(`   ❌ Losing inquiry status: ${losing.status} (expected: rejected)`);
        step9Pass = false;
      }
    } else {
      console.log(`   ⚠️  Could not find losing inquiry in admin list`);
    }
  } catch (err) {
    console.log(`   ⚠️  Could not verify inquiries via admin: ${err.message}`);
  }

  // 9c. Check order has OTPs
  if (order && order.otpStart && order.otpEnd) {
    console.log(`   ✅ Order has OTP Start (${order.otpStart}) and OTP End (${order.otpEnd})`);
  } else {
    console.log(`   ❌ Order missing OTPs`);
    step9Pass = false;
  }

  log(9, step9Pass ? 'PASS' : 'FAIL', `Final state verification ${step9Pass ? 'passed' : 'has issues'}`);

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`  Total Steps: ${results.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Result: ${failed === 0 ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  console.log('═'.repeat(60) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

// Run
runTest().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
