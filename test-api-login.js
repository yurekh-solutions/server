const axios = require('axios');

async function testLoginAPI() {
  try {
    console.log('🔍 Testing Login API on Render Server...\n');
    
    // Test 1: Login with buyer@test.com
    console.log('[Test 1] Login: buyer@test.com / password123');
    try {
      const res1 = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
        email: 'buyer@test.com',
        password: 'password123'
      });
      console.log('✅ SUCCESS:', res1.data.success);
      console.log('   User:', res1.data.user?.name);
      console.log('   Token:', res1.data.token ? 'Received' : 'Missing');
    } catch (err) {
      console.log('❌ FAILED:', err.response?.data?.message || err.message);
      console.log('   Status:', err.response?.status);
    }
    
    console.log('');
    
    // Test 2: Try to register new user
    console.log('[Test 2] Register new buyer...');
    const newEmail = `test${Date.now()}@example.com`;
    try {
      const res2 = await axios.post('https://server-xb4a.onrender.com/api/auth/register', {
        email: newEmail,
        password: 'password123',
        name: 'Test Buyer',
        phone: '9876543210',
        userType: 'buyer',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        street: 'Test Street'
      });
      console.log('✅ Registration SUCCESS');
      console.log('   User ID:', res2.data.user?.id);
      
      // Now try to login with new user
      console.log('\n[Test 3] Login with newly registered user...');
      const res3 = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
        email: newEmail,
        password: 'password123'
      });
      console.log('✅ Login SUCCESS:', res3.data.success);
      console.log('   User:', res3.data.user?.name);
      
    } catch (err) {
      console.log('❌ FAILED:', err.response?.data?.message || err.message);
      console.log('   Status:', err.response?.status);
      console.log('   Response:', JSON.stringify(err.response?.data, null, 2));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLoginAPI();
