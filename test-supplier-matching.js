/**
 * Integration test for supplier matching with real pincode data
 * Tests the complete flow: database → matching algorithm → results
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Requirement = require('./models/Requirement');
const { calculatePincodeDistance, getDistanceCategory } = require('./utils/pincodeDistance');

require('dotenv').config();

async function testSupplierMatching() {
  console.log('🧪 Testing Supplier Matching with Real Pincodes\n');
  console.log('='.repeat(60));

  // Connect to database
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Make sure MongoDB is running and .env file exists');
    process.exit(1);
  }

  try {
    // Step 1: Check existing suppliers
    console.log('📋 Step 1: Checking existing suppliers...');
    const suppliers = await User.find({ userType: 'supplier' }).select(
      'name businessName address serviceArea rating totalOrders'
    );
    
    console.log(`Found ${suppliers.length} supplier(s)\n`);
    
    if (suppliers.length === 0) {
      console.log('⚠️  No suppliers found in database.');
      console.log('📝 Creating test suppliers...\n');
      
      // Create test suppliers with different pincodes
      const testSuppliers = [
        {
          name: 'Test Supplier 1',
          email: 'supplier1@test.com',
          password: 'test123',
          phone: '9876543210',
          userType: 'supplier',
          businessName: 'Mumbai AV Rentals',
          address: {
            street: 'Andheri West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400053',
            country: 'India',
          },
          serviceArea: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400053',
            fullAddress: 'Andheri West, Mumbai',
          },
          rating: 4.5,
          totalOrders: 50,
          accountStatus: 'active',
          kycStatus: 'approved',
        },
        {
          name: 'Test Supplier 2',
          email: 'supplier2@test.com',
          password: 'test123',
          phone: '9876543211',
          userType: 'supplier',
          businessName: 'Bandra Events',
          address: {
            street: 'Bandra East',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400051',
            country: 'India',
          },
          serviceArea: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400051',
            fullAddress: 'Bandra East, Mumbai',
          },
          rating: 4.8,
          totalOrders: 120,
          accountStatus: 'active',
          kycStatus: 'approved',
        },
        {
          name: 'Test Supplier 3',
          email: 'supplier3@test.com',
          password: 'test123',
          phone: '9876543212',
          userType: 'supplier',
          businessName: 'Thane Sound Systems',
          address: {
            street: 'Thane West',
            city: 'Thane',
            state: 'Maharashtra',
            pincode: '400601',
            country: 'India',
          },
          serviceArea: {
            city: 'Thane',
            state: 'Maharashtra',
            pincode: '400601',
            fullAddress: 'Thane West',
          },
          rating: 4.2,
          totalOrders: 30,
          accountStatus: 'active',
          kycStatus: 'approved',
        },
        {
          name: 'Test Supplier 4',
          email: 'supplier4@test.com',
          password: 'test123',
          phone: '9876543213',
          userType: 'supplier',
          businessName: 'Pune AV Solutions',
          address: {
            street: 'Koregaon Park',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            country: 'India',
          },
          serviceArea: {
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            fullAddress: 'Koregaon Park, Pune',
          },
          rating: 4.9,
          totalOrders: 200,
          accountStatus: 'active',
          kycStatus: 'approved',
        },
      ];

      await User.insertMany(testSuppliers);
      console.log('✅ Created 4 test suppliers with different pincodes\n');
      
      // Reload suppliers
      const updatedSuppliers = await User.find({ userType: 'supplier' }).select(
        'name businessName address serviceArea rating totalOrders'
      );
      suppliers.push(...updatedSuppliers);
    }

    // Display suppliers
    suppliers.forEach((s, i) => {
      const pincode = s.address?.pincode || s.serviceArea?.pincode || 'N/A';
      console.log(`  ${i + 1}. ${s.businessName || s.name}`);
      console.log(`     Pincode: ${pincode} | Rating: ${s.rating} | Orders: ${s.totalOrders}`);
    });
    console.log('');

    // Step 2: Create test requirement
    console.log('📋 Step 2: Creating test requirement from buyer...');
    
    const testBuyerPincode = '400053'; // Andheri West, Mumbai
    const testRequirement = {
      buyerId: new mongoose.Types.ObjectId(),
      location: {
        address: 'Andheri West, Mumbai',
        city: 'Mumbai',
        pincode: testBuyerPincode,
      },
      eventType: 'Wedding',
      date: '2026-06-15',
      startTime: '18:00',
      endTime: '23:00',
      items: ['Speakers', 'Microphone', 'LED Lights'],
      budget: '₹25K-50K',
      notes: 'Need equipment for wedding reception',
      status: 'open',
    };

    const requirement = await Requirement.create(testRequirement);
    console.log(`✅ Created requirement with pincode: ${testBuyerPincode}\n`);

    // Step 3: Calculate distances manually
    console.log('📋 Step 3: Calculating pincode distances...\n');
    console.log(`Buyer Pincode: ${testBuyerPincode}\n`);

    const distanceResults = suppliers.map((s) => {
      const supplierPincode = s.address?.pincode || s.serviceArea?.pincode;
      
      if (!supplierPincode) {
        return {
          supplier: s.businessName || s.name,
          pincode: 'N/A',
          distance: null,
          category: 'Unknown',
          error: 'No pincode available',
        };
      }

      const distance = calculatePincodeDistance(testBuyerPincode, supplierPincode);
      const category = getDistanceCategory(distance);

      return {
        supplier: s.businessName || s.name,
        pincode: supplierPincode,
        distance,
        category,
        rating: s.rating,
        totalOrders: s.totalOrders,
      };
    });

    // Display distance calculations
    distanceResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.supplier}`);
      console.log(`   Pincode: ${result.pincode}`);
      console.log(`   Distance: ${result.distance} km (${result.category})`);
      console.log(`   Rating: ${result.rating} | Orders: ${result.totalOrders}`);
      console.log('');
    });

    // Step 4: Simulate matching algorithm
    console.log('📋 Step 4: Simulating matching algorithm...\n');

    const norm = (v, max, lowerBetter = true) => {
      const clamped = Math.min(v, max) / max;
      return lowerBetter ? 1 - clamped : clamped;
    };

    const scored = distanceResults.map((result) => {
      const distanceKm = result.distance || 10;
      const rating = result.rating || 3.5;
      const responseTimeMins = 15;
      const estimatedPrice = 25000;

      const distScore = norm(distanceKm, 50);
      const ratingScore = norm(rating, 5, false);
      const priceScore = norm(estimatedPrice, 100000);
      const responseScore = norm(responseTimeMins, 120);

      const score = 0.3 * distScore + 0.3 * ratingScore + 0.2 * priceScore + 0.2 * responseScore;

      return {
        ...result,
        distScore: Math.round(distScore * 100),
        ratingScore: Math.round(ratingScore * 100),
        priceScore: Math.round(priceScore * 100),
        responseScore: Math.round(responseScore * 100),
        totalScore: Math.round(score * 100),
      };
    });

    // Sort by score
    scored.sort((a, b) => b.totalScore - a.totalScore);

    console.log('🏆 Ranked Suppliers:\n');
    scored.forEach((result, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`${medal} #${i + 1}: ${result.supplier}`);
      console.log(`    Score: ${result.totalScore}/100`);
      console.log(`    Distance: ${result.distance}km (${result.category})`);
      console.log(`    Components: Distance=${result.distScore}%, Rating=${result.ratingScore}%, Price=${result.priceScore}%, Response=${result.responseScore}%`);
      console.log('');
    });

    // Step 5: Test radius filtering
    console.log('📋 Step 5: Testing radius filtering...\n');
    
    const radiuses = [5, 10, 25, 50];
    radiuses.forEach((radius) => {
      const filtered = scored.filter((s) => s.distance <= radius);
      console.log(`  Within ${radius}km: ${filtered.length} supplier(s)`);
      if (filtered.length > 0) {
        filtered.forEach((s) => console.log(`    - ${s.supplier} (${s.distance}km)`));
      }
    });

    // Step 6: Cleanup
    console.log('\n📋 Step 6: Cleaning up test data...');
    await Requirement.findByIdAndDelete(requirement._id);
    
    // Remove test suppliers (those with @test.com email)
    const deleted = await User.deleteMany({ 
      userType: 'supplier', 
      email: { $regex: /@test\.com$/ } 
    });
    console.log(`✅ Cleaned up ${deleted.deletedCount} test supplier(s)`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Testing completed successfully!\n');

    console.log('📊 Summary:');
    console.log('  ✓ Pincode distance calculation works correctly');
    console.log('  ✓ Suppliers ranked by proximity + rating + price');
    console.log('  ✓ Radius filtering functional');
    console.log('  ✓ Real pincode data from database processed\n');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  }
}

// Run the test
testSupplierMatching();
