// Test script to verify supplier approval and rejection flows
const axios = require('axios');

const BASE_URL = 'http://localhost:8082/api';
const ADMIN_TOKEN = 'admin123'; // Replace with your actual admin token

async function testApprovalRejectionFlow() {
  console.log('🧪 Testing Supplier Approval/Rejection Flow\n');

  // Step 1: Register a test supplier
  console.log('📝 Step 1: Registering test supplier...');
  const testEmail = `test_${Date.now()}@example.com`;
  const testSupplier = {
    name: 'Test Supplier',
    email: testEmail,
    phone: '9876543210',
    password: 'password123',
    address: {
      street: 'Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
    },
    street: 'Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    businessName: 'Test Business',
    role: 'supplier',
    userType: 'supplier',
  };

  let supplierId;
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, testSupplier);
    supplierId = regRes.data.user?.id || regRes.data.id;
    console.log('✅ Supplier registered:', testEmail);
    console.log('   Supplier ID:', supplierId);
    console.log('   Account Status:', regRes.data.user?.accountStatus);
  } catch (err) {
    console.error('❌ Registration failed:', err.response?.data || err.message);
    return;
  }

  // Step 2: Try to login (should fail with pending status)
  console.log('\n🔐 Step 2: Attempting login (should be blocked - pending)...');
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'password123',
    });
    console.log('❌ Login should have been blocked!');
  } catch (err) {
    if (err.response?.data?.code === 'ACCOUNT_PENDING') {
      console.log('✅ Login correctly blocked - Account pending approval');
    } else {
      console.error('❌ Unexpected error:', err.response?.data || err.message);
    }
  }

  // Step 3: Admin approves the supplier
  console.log('\n✅ Step 3: Admin approves supplier...');
  try {
    await axios.put(
      `${BASE_URL}/admin/vendors/${supplierId}/approve`,
      {},
      { headers: { 'x-admin-token': ADMIN_TOKEN } }
    );
    console.log('✅ Supplier approved by admin');
  } catch (err) {
    console.error('❌ Approval failed:', err.response?.data || err.message);
    return;
  }

  // Step 4: Login after approval (should succeed)
  console.log('\n🔐 Step 4: Login after approval (should succeed)...');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'password123',
    });
    console.log('✅ Login successful!');
    console.log('   Just Approved:', loginRes.data.justApproved);
    console.log('   Account Status:', loginRes.data.user?.accountStatus);
    console.log('   KYC Status:', loginRes.data.user?.kycStatus);
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data || err.message);
  }

  // Step 5: Test rejection flow - register another supplier
  console.log('\n📝 Step 5: Registering second supplier for rejection test...');
  const testEmail2 = `test_reject_${Date.now()}@example.com`;
  let supplierId2;
  try {
    const regRes2 = await axios.post(`${BASE_URL}/auth/register`, {
      ...testSupplier,
      email: testEmail2,
    });
    supplierId2 = regRes2.data.user?.id || regRes2.data.id;
    console.log('✅ Second supplier registered:', testEmail2);
  } catch (err) {
    console.error('❌ Registration failed:', err.response?.data || err.message);
    return;
  }

  // Step 6: Admin rejects the supplier
  console.log('\n❌ Step 6: Admin rejects supplier...');
  const rejectionReason = 'Documents do not match business details. Please re-upload clear copies of PAN and GST certificate.';
  try {
    await axios.put(
      `${BASE_URL}/admin/vendors/${supplierId2}/reject`,
      { reason: rejectionReason },
      { headers: { 'x-admin-token': ADMIN_TOKEN } }
    );
    console.log('✅ Supplier rejected by admin');
  } catch (err) {
    console.error('❌ Rejection failed:', err.response?.data || err.message);
    return;
  }

  // Step 7: Try to login rejected account (should show rejection popup)
  console.log('\n🔐 Step 7: Login rejected account (should show rejection)...');
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail2,
      password: 'password123',
    });
    console.log('❌ Login should have been blocked!');
  } catch (err) {
    if (err.response?.data?.code === 'ACCOUNT_REJECTED') {
      console.log('✅ Login correctly blocked - Account rejected');
      console.log('   Rejection Reason:', err.response?.data?.rejectionReason);
      console.log('   ℹ️  This will trigger the rejection popup in the mobile app');
    } else {
      console.error('❌ Unexpected error:', err.response?.data || err.message);
    }
  }

  console.log('\n🎉 Test Complete!');
  console.log('\n📱 To test on mobile:');
  console.log('   1. Open the supplier app');
  console.log('   2. Try to login with the rejected account');
  console.log('   3. You should see the "Account Rejected" popup');
  console.log('   4. The popup will show the rejection reason from admin');
}

// Run the test
testApprovalRejectionFlow().catch(console.error);
