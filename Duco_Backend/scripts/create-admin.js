const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const EmployeesAcc = require('../DataBase/Models/EmployessAcc');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/duco';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const admins = [
      {
        url: 'superadmin',
        employeeid: 'superadmin',
        password: 'SuperAdmin@2024',
        employeesdetails: {
          name: 'Super Admin',
          email: 'superadmin@duco.com',
          role: 'superadmin'
        },
        employeesNote: 'Super Admin - Full system access'
      },
      {
        url: 'admin',
        employeeid: 'admin',
        password: 'admin123',
        employeesdetails: {
          name: 'Admin',
          email: 'admin@duco.com',
          role: 'admin'
        },
        employeesNote: 'Default admin account'
      }
    ];

    console.log('\n🔐 Creating admin accounts...\n');

    for (const adminData of admins) {
      const existingAdmin = await EmployeesAcc.findOne({ employeeid: adminData.employeeid });
      
      if (existingAdmin) {
        console.log(`ℹ️ ${adminData.employeesdetails.name} already exists`);
        console.log(`   Employee ID: ${adminData.employeeid}`);
        console.log(`   Email: ${adminData.employeesdetails.email}`);
        console.log(`   Role: ${adminData.employeesdetails.role}\n`);
      } else {
        // Hash password and create admin
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        
        await EmployeesAcc.create({
          ...adminData,
          password: hashedPassword
        });

        console.log(`✅ ${adminData.employeesdetails.name} created successfully!`);
        console.log(`   Employee ID: ${adminData.employeeid}`);
        console.log(`   Password: ${adminData.password}`);
        console.log(`   Email: ${adminData.employeesdetails.email}`);
        console.log(`   Role: ${adminData.employeesdetails.role}\n`);
      }
    }

    console.log('⚠️ IMPORTANT: Change these passwords after first login!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
