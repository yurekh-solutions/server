// Test Cloudinary upload with freshly registered user
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_HOST = 'localhost';
const API_PORT = 3002;

function makeRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function testCloudinary() {
  console.log('\n🧪 Testing Cloudinary Upload...\n');

  try {
    // Step 1: Register new user
    console.log('1️⃣ Registering new user...');
    const timestamp = Date.now();
    const registerResult = await makeRequest('POST', '/api/auth/register', {
      'Content-Type': 'application/json',
    }, JSON.stringify({
      name: 'Cloudinary Test User',
      email: `cloudinarytest${timestamp}@test.com`,
      password: 'test123456',
      phone: '9999999999',
      userType: 'buyer',
    }));

    if (!registerResult.data.success) {
      throw new Error('Registration failed: ' + registerResult.data.message);
    }

    console.log('✅ User registered');
    const token = registerResult.data.token;
    console.log('   User ID:', registerResult.data.user?.id);

    // Step 2: Create test image
    console.log('\n2️⃣ Creating test image...');
    const testImagePath = path.join(__dirname, 'test-final.jpg');
    const testImage = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEEAhEQA/AFcA/9k=',
      'base64'
    );
    fs.writeFileSync(testImagePath, testImage);
    console.log('✅ Image created');

    // Step 3: Upload to Cloudinary
    console.log('\n3️ Uploading to Cloudinary...');
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const imageData = fs.readFileSync(testImagePath);
    
    let formData = '';
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="file"; filename="test.jpg"\r\n`;
    formData += `Content-Type: image/jpeg\r\n\r\n`;
    
    const formDataBuffer = Buffer.from(formData, 'binary');
    const endBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'binary');
    
    const body = Buffer.concat([formDataBuffer, imageData, endBuffer]);

    const uploadResult = await makeRequest('POST', '/api/upload/avatar', {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    }, body);

    console.log('\n📋 Upload Result:');
    console.log('   Status:', uploadResult.statusCode);
    
    if (uploadResult.data && typeof uploadResult.data === 'object') {
      console.log('   Response:', JSON.stringify(uploadResult.data, null, 2));
      
      if (uploadResult.data.success && uploadResult.data.url?.includes('res.cloudinary.com')) {
        console.log('\n🎉 SUCCESS! Cloudinary upload is working perfectly!');
        console.log('   Cloud URL:', uploadResult.data.url);
      } else if (uploadResult.data.success) {
        console.log('\n⚠️ Upload succeeded but URL is not from Cloudinary');
        console.log('   URL:', uploadResult.data.url);
      } else {
        console.log('\n❌ Upload failed:', uploadResult.data.message);
      }
    } else {
      console.log('   Raw Response:', uploadResult.data);
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  console.log('\n');
}

testCloudinary();
