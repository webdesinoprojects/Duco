const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const EmployeesAcc = require('../DataBase/Models/EmployessAcc');
require('dotenv').config();

async function forceCreateSuperAdmin() {
  try {
    const mongoUrl = process.env.DB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/duco';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');

    const superAdminData = {
      url: 'superadmin',
      employeeid: 'superadmin',
      password: 'SuperAdmin@2024',
      employeesdetails: {
        name: 'Super Admin',
        email: 'superadmin@duco.com',
        role: 'Admin' // Using 'Admin' role which exists in the enum
      },
      employeesNote: 'Super Admin - Full system access',
      permissions: {
        inventory: true,
        categories: true,
        products: true,
        banner: true,
        blog: true,
        manageBulkOrder: true,
        manageOrder: true,
        logistics: true,
        setMoney: true,
        chargesPlan: true,
        corporateSettings: true,
        bankDetails: true,
        employeeManagement: true,
        userAnalysis: true,
        invoice: true,
        sales: true,
      }
    };

    // Check if exists
    const existing = await EmployeesAcc.findOne({ employeeid: 'superadmin' });
    
    if (existing) {
      console.log('⚠️  Superadmin already exists!');
      console.log('   Deleting old superadmin...');
      await EmployeesAcc.deleteOne({ employeeid: 'superadmin' });
      console.log('   ✅ Deleted\n');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
    
    // Create new superadmin
    const newAdmin = await EmployeesAcc.create({
      ...superAdminData,
      password: hashedPassword
    });

    console.log('🎉 SUPERADMIN CREATED SUCCESSFULLY!\n');
    console.log('='.repeat(80));
    console.log('\n📋 Login Credentials:\n');
    console.log('   User ID: superadmin');
    console.log('   Password: SuperAdmin@2024');
    console.log('   Email: superadmin@duco.com');
    console.log('   Role: Admin');
    console.log('\n='.repeat(80));
    console.log('\n🌐 Login at: http://localhost:5173/admin/login');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

    // Verify it was created
    const verify = await EmployeesAcc.findOne({ employeeid: 'superadmin' });
    if (verify) {
      console.log('✅ Verification: Superadmin exists in database');
      console.log(`   Database ID: ${verify._id}`);
      console.log(`   Has password: ${!!verify.password}`);
      
      // Test password
      const passwordMatch = await bcrypt.compare('SuperAdmin@2024', verify.password);
      console.log(`   Password test: ${passwordMatch ? '✅ CORRECT' : '❌ INCORRECT'}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

forceCreateSuperAdmin();
