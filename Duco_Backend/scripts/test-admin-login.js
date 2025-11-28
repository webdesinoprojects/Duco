const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const EmployeesAcc = require('../DataBase/Models/EmployessAcc');
require('dotenv').config();

async function testAdminLogin() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.DB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/duco';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');

    // Test credentials
    const testCredentials = [
      { userid: 'superadmin', password: 'SuperAdmin@2024' },
      { userid: 'admin', password: 'admin123' },
    ];

    console.log('🧪 Testing Admin Login Credentials\n');
    console.log('='.repeat(80));

    for (const cred of testCredentials) {
      console.log(`\n🔐 Testing: ${cred.userid}`);
      console.log('-'.repeat(80));

      // Find user by employeeid
      const user = await EmployeesAcc.findOne({ employeeid: cred.userid });

      if (!user) {
        console.log(`❌ User "${cred.userid}" NOT FOUND in database`);
        console.log(`   💡 Run: node scripts/create-admin.js`);
        continue;
      }

      console.log(`✅ User found in database`);
      console.log(`   Name: ${user.employeesdetails?.name || 'N/A'}`);
      console.log(`   Email: ${user.employeesdetails?.email || 'N/A'}`);
      console.log(`   Role: ${user.employeesdetails?.role || 'N/A'}`);
      console.log(`   Employee ID: ${user.employeeid}`);

      // Test password
      const passwordMatch = await bcrypt.compare(cred.password, user.password);

      if (passwordMatch) {
        console.log(`✅ Password "${cred.password}" is CORRECT`);
        console.log(`\n   🎉 LOGIN SHOULD WORK WITH:`);
        console.log(`      User ID: ${cred.userid}`);
        console.log(`      Password: ${cred.password}`);
      } else {
        console.log(`❌ Password "${cred.password}" is INCORRECT`);
        console.log(`   ⚠️  The password in the database is different`);
        console.log(`   💡 You may need to reset the password`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Summary:');
    console.log('   - If user NOT FOUND: Run "node scripts/create-admin.js"');
    console.log('   - If password INCORRECT: The password was changed or is different');
    console.log('   - If both CORRECT: Login should work at /admin/login\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAdminLogin();
