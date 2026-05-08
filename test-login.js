const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const users = await User.find({}, 'email name userType accountStatus');
    
    console.log('📋 Users in Database:');
    console.log('-'.repeat(60));
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email}`);
      console.log(`   Name: ${u.name}`);
      console.log(`   Type: ${u.userType}`);
      console.log(`   Status: ${u.accountStatus}`);
      console.log('');
    });
    
    console.log(`\nTotal users: ${users.length}`);
    
    // Test login with buyer@test.com
    console.log('\n🔍 Testing login for buyer@test.com...');
    const testUser = await User.findOne({ email: 'buyer@test.com' }).select('+password');
    
    if (testUser) {
      console.log('✅ User found in database');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Has password hash: ${testUser.password ? 'Yes' : 'No'}`);
      console.log(`   Password length: ${testUser.password?.length || 0}`);
      
      // Try to compare password
      const isMatch = await testUser.comparePassword('password123');
      console.log(`   Password match (password123): ${isMatch ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ User buyer@test.com NOT found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
