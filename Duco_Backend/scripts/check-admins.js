const mongoose = require('mongoose');
const EmployeesAcc = require('../DataBase/Models/EmployessAcc');
require('dotenv').config();

async function checkAdmins() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/duco';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');

    // Find all admin accounts
    const admins = await EmployeesAcc.find({
      'employeesdetails.role': { $in: ['superadmin', 'admin', 'Admin', 'Accounting and Management'] }
    }).select('-password');

    console.log('📋 Admin Accounts Found:\n');
    console.log('='.repeat(80));

    if (admins.length === 0) {
      console.log('❌ No admin accounts found in database!');
      console.log('\n💡 Run this command to create admin accounts:');
      console.log('   node scripts/create-admin.js\n');
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ${admin.employeesdetails?.name || 'Unknown'}`);
        console.log('   ' + '-'.repeat(70));
        console.log(`   Employee ID: ${admin.employeeid}`);
        console.log(`   Email: ${admin.employeesdetails?.email || 'N/A'}`);
        console.log(`   Role: ${admin.employeesdetails?.role || 'N/A'}`);
        console.log(`   URL: ${admin.url}`);
        console.log(`   Note: ${admin.employeesNote || 'N/A'}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log('\n📝 Login Instructions:');
      console.log('   1. Go to: /admin/login');
      console.log('   2. Enter Employee ID (e.g., "superadmin" or "admin")');
      console.log('   3. Enter the password you set when creating the account');
      console.log('\n⚠️  If you forgot the password, you can reset it using:');
      console.log('   - The forgot password feature at /admin/forgot-password');
      console.log('   - Or delete and recreate the admin account\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdmins();
