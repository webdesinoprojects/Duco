const mongoose = require('mongoose');
const EmployeesAcc = require('../DataBase/Models/EmployessAcc');
require('dotenv').config();

async function showAllEmployees() {
  try {
    const mongoUrl = process.env.DB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/duco';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');

    const employees = await EmployeesAcc.find({}).select('-password');

    console.log(`📋 Total Employees: ${employees.length}\n`);
    console.log('='.repeat(100));

    employees.forEach((emp, index) => {
      console.log(`\n${index + 1}. ${emp.employeesdetails?.name || 'Unknown'}`);
      console.log('   ' + '-'.repeat(90));
      console.log(`   Employee ID: ${emp.employeeid}`);
      console.log(`   Email: ${emp.employeesdetails?.email || 'N/A'}`);
      console.log(`   Role: ${emp.employeesdetails?.role || 'N/A'}`);
      console.log(`   URL: ${emp.url}`);
      console.log(`   Created: ${emp.createdAt}`);
    });

    console.log('\n' + '='.repeat(100));

    // Find the superadmin specifically
    const superadmin = await EmployeesAcc.findOne({ employeeid: 'superadmin' });
    const admin = await EmployeesAcc.findOne({ employeeid: 'admin' });

    console.log('\n🔍 Checking specific accounts:\n');
    
    if (superadmin) {
      console.log('✅ superadmin EXISTS');
      console.log(`   Role: ${superadmin.employeesdetails?.role}`);
      console.log(`   Has password: ${!!superadmin.password}`);
    } else {
      console.log('❌ superadmin NOT FOUND');
    }

    if (admin) {
      console.log('✅ admin EXISTS');
      console.log(`   Role: ${admin.employeesdetails?.role}`);
      console.log(`   Has password: ${!!admin.password}`);
    } else {
      console.log('❌ admin NOT FOUND');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

showAllEmployees();
