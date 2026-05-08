const axios = require('axios');

async function testLogin() {
  console.log(' Testing Login for arya@gmail.com\n');
  console.log('='.repeat(60));
  
  try {
    const loginRes = await axios.post('https://server-xb4a.onrender.com/api/auth/login', {
      email: 'arya@gmail.com',
      password: 'arya@123'
    });
    
    console.log('✅ LOGIN SUCCESSFUL!');
    console.log('');
    console.log('📋 User Details:');
    console.log('   Name:', loginRes.data.user?.name);
    console.log('   Email:', loginRes.data.user?.email);
    console.log('   Type:', loginRes.data.user?.userType);
    console.log('   Phone:', loginRes.data.user?.phone);
    console.log('   Status:', loginRes.data.user?.accountStatus);
    console.log('');
    console.log('🎫 Token:', loginRes.data.token ? 'Received ✓' : 'Missing ✗');
    console.log('');
    console.log('='.repeat(60));
    console.log(' PROOF: Registered email CAN login!');
    console.log('='.repeat(60));
    
  } catch (err) {
    console.log('❌ LOGIN FAILED');
    console.log('   Status:', err.response?.status);
    console.log('   Error:', err.response?.data?.message || err.message);
  }
}

testLogin();
