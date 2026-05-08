const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixExistingPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users\n`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const user of users) {
      const passwordLength = user.password?.length || 0;
      
      // If password hash is not 60 chars (bcrypt standard), it needs fixing
      if (passwordLength !== 60) {
        console.log(`🔧 Fixing: ${user.email}`);
        console.log(`   Old password length: ${passwordLength}`);
        
        // Re-hash the password (assuming it's stored as plain text)
        const hashedPassword = await bcrypt.hash(user.password, 12);
        user.password = hashedPassword;
        await user.save();
        
        console.log(`   ✅ Fixed! New hash length: ${user.password.length}`);
        fixed++;
      } else {
        console.log(`⏭️  Skipping: ${user.email} (already hashed)`);
        skipped++;
      }
      console.log('');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Fixed: ${fixed} users`);
    console.log(`   Skipped: ${skipped} users (already correct)`);
    console.log(`   Total: ${users.length} users`);
    console.log('='.repeat(60));
    
    // Test one user
    if (users.length > 0) {
      const testUser = await User.findOne({ email: 'buyer@test.com' }).select('+password');
      if (testUser) {
        console.log('\n🔍 Testing buyer@test.com...');
        const isMatch = await testUser.comparePassword('password123');
        console.log(`   Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixExistingPasswords();
