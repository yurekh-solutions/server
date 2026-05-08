const axios = require('axios');

// Test all database users to verify NO hardcoded credentials
const testUsers = [
  { email: 'buyer@test.com', password: 'password123', expected: 'Demo Buyer' },
  { email: 'supplier@test.com', password: 'password123', expected: 'Demo Supplier' },
  { email: 'proav@urbanav.com', password: 'password123', expected: 'ProAV Solutions' },
  { email: 'soundmaster@urbanav.com', password: 'password123', expected: 'SoundMaster Events' },
  { email: 'djpro@urbanav.com', password: 'password123', expected: 'DJ Pro Rentals' },
  { email: 'techvision@urbanav.com', password: 'password123', expected: 'TechVision' },
];

// Test wrong credentials (should FAIL)
const wrongCredentials = [
  { email: 'buyer@test.com', password: 'wrongpassword' },
  { email: 'nonexistent@test.com', password: 'password123' },
];

async function verifyAllUsers() {
  console.log('🔍 VERIFYING: All Users Can Login (No Hardcoded Credentials)\n');
  console.log('=' .repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: All valid users should login successfully
  console.log('\n📋 Test 1: Valid Database Users Login');
  console.log('-'.repeat(70));
  
  for (const user of testUsers) {
    try {
      const res = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
        email: user.email,
        password: user.password
      });
      
      if (res.data.success && res.data.user?.name === user.expected) {
        console.log(`✅ PASS: ${user.email}`);
        console.log(`   User: ${res.data.user.name}`);
        console.log(`   Type: ${res.data.user.userType}`);
        console.log(`   Token: ${res.data.token ? 'Received ✓' : 'Missing ✗'}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${user.email}`);
        console.log(`   Expected: ${user.expected}, Got: ${res.data.user?.name}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ FAIL: ${user.email}`);
      console.log(`   Error: ${err.response?.data?.message || err.message}`);
      failed++;
    }
    console.log('');
  }
  
  // Test 2: Wrong credentials should FAIL (proving no hardcoded bypass)
  console.log('\n📋 Test 2: Wrong Credentials Should FAIL');
  console.log('-'.repeat(70));
  
  for (const user of wrongCredentials) {
    try {
      const res = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
        email: user.email,
        password: user.password
      });
      
      // If we reach here, it means login succeeded with wrong credentials (BAD!)
      console.log(`❌ FAIL: ${user.email} logged in with wrong password!`);
      console.log(`   This means hardcoded credentials still exist!`);
      failed++;
    } catch (err) {
      // This is EXPECTED - should fail with 401
      if (err.response?.status === 401) {
        console.log(`✅ PASS: ${user.email} correctly rejected`);
        console.log(`   Error: ${err.response.data.message}`);
        passed++;
      } else {
        console.log(`⚠️  ERROR: ${user.email}`);
        console.log(`   Status: ${err.response?.status}`);
        console.log(`   Error: ${err.response?.data?.message || err.message}`);
        failed++;
      }
    }
    console.log('');
  }
  
  // Test 3: Register new user and login
  console.log('\n📋 Test 3: Register New User & Login');
  console.log('-'.repeat(70));
  
  const newEmail = `test${Date.now()}@example.com`;
  try {
    // Register
    const registerRes = await axios.post('https://server-xb4a.onrender.com/api/auth/register', {
      email: newEmail,
      password: 'password123',
      name: 'Test Dynamic User',
      phone: '9876543210',
      userType: 'buyer',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      street: 'Test Street'
    });
    
    if (registerRes.data.success) {
      console.log(`✅ PASS: Registered ${newEmail}`);
      
      // Now login with new user
      const loginRes = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
        email: newEmail,
        password: 'password123'
      });
      
      if (loginRes.data.success) {
        console.log(`✅ PASS: Logged in with newly registered user`);
        console.log(`   User: ${loginRes.data.user.name}`);
        console.log(`   Token: ${loginRes.data.token ? 'Received ✓' : 'Missing ✗'}`);
        passed++;
      } else {
        console.log(`❌ FAIL: Could not login after registration`);
        failed++;
      }
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.response?.data?.message || err.message}`);
    failed++;
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total:  ${passed + failed}`);
  console.log('='.repeat(70));
  
  if (failed === 0) {
    console.log('\n🎉 SUCCESS! All tests passed!');
    console.log('✅ All database users can login');
    console.log('✅ Wrong credentials are rejected');
    console.log('✅ New registrations can login');
    console.log('✅ NO hardcoded credentials detected!');
    console.log('\n🚀 Authentication is 100% DYNAMIC and DATABASE-DRIVEN!');
  } else {
    console.log('\n⚠️  FAILED! Some tests did not pass.');
    console.log('Please review the failures above.');
  }
  console.log('='.repeat(70));
}

verifyAllUsers();
