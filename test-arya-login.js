const axios = require('axios');

async function testAryaRegistration() {
  console.log(' Testing arya@gmail.com Registration & Login\n');
  console.log('='.repeat(60));
  
  // Test 1: Try to register arya@gmail.com
  console.log('\n[Test 1] Registering arya@gmail.com...');
  try {
    const registerRes = await axios.post('https://server-xb4a.onrender.com/api/auth/register', {
      email: 'arya@gmail.com',
      password: 'arya@123',
      name: 'Arya',
      phone: '9876543210',
      userType: 'buyer',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      street: 'Test Address'
    });
    
    console.log('✅ Registration SUCCESS');
    console.log('   User ID:', registerRes.data.user?.id);
    console.log('   Name:', registerRes.data.user?.name);
    console.log('   Email:', registerRes.data.user?.email);
    console.log('   Type:', registerRes.data.user?.userType);
    
  } catch (err) {
    console.log('❌ Registration FAILED');
    console.log('   Status:', err.response?.status);
    console.log('   Error:', err.response?.data?.message || err.message);
    console.log('   Details:', JSON.stringify(err.response?.data, null, 2));
    return;
  }
  
  // Test 2: Try to login with arya@gmail.com
  console.log('\n[Test 2] Login with arya@gmail.com...');
  try {
    const loginRes = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
      email: 'arya@gmail.com',
      password: 'arya@123'
    });
    
    console.log('✅ Login SUCCESS');
    console.log('   User:', loginRes.data.user?.name);
    console.log('   Email:', loginRes.data.user?.email);
    console.log('   Type:', loginRes.data.user?.userType);
    console.log('   Token:', loginRes.data.token ? 'Received ✓' : 'Missing ✗');
    
  } catch (err) {
    console.log('❌ Login FAILED');
    console.log('   Status:', err.response?.status);
    console.log('   Error:', err.response?.data?.message || err.message);
    console.log('   Details:', JSON.stringify(err.response?.data, null, 2));
  }
  
  console.log('\n' + '='.repeat(60));
}

testAryaRegistration();
