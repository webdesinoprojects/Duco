// Script to update existing employees with permissions based on their role
const mongoose = require('mongoose');
require('dotenv').config();

const EmployeesAcc = require('../DataBase/Models/EmployessAcc');

async function updateEmployeePermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all employees
    const employees = await EmployeesAcc.find({});
    console.log(`📋 Found ${employees.length} employees`);

    let updated = 0;
    let skipped = 0;

    for (const employee of employees) {
      const role = employee.employeesdetails?.role;
      
      console.log(`\n👤 Processing: ${employee.employeesdetails?.name || employee.employeeid}`);
      console.log(`   Role: ${role || 'None'}`);
      console.log(`   Current permissions:`, employee.permissions);

      // Initialize permissions object
      const permissions = {
        inventory: false,
        categories: false,
        products: false,
        banner: false,
        blog: false,
        manageBulkOrder: false,
        manageOrder: false,
        logistics: false,
        setMoney: false,
        chargesPlan: false,
        corporateSettings: false,
        bankDetails: false,
        employeeManagement: false,
        userAnalysis: false,
        invoice: false,
        sales: false,
      };

      // Set permissions based on role
      if (role === 'Graphic Designer') {
        permissions.inventory = true;
        permissions.categories = true;
        permissions.products = true;
        permissions.banner = true;
        permissions.blog = true;
        console.log('   ✅ Assigned Graphic Designer permissions');
      } else if (role === 'Order Manager') {
        permissions.manageBulkOrder = true;
        permissions.manageOrder = true;
        permissions.logistics = true;
        permissions.setMoney = true;
        permissions.chargesPlan = true;
        permissions.corporateSettings = true;
        console.log('   ✅ Assigned Order Manager permissions');
      } else if (role === 'Accounting and Management') {
        permissions.bankDetails = true;
        permissions.employeeManagement = true;
        permissions.userAnalysis = true;
        permissions.invoice = true;
        permissions.sales = true;
        console.log('   ✅ Assigned Accounting and Management permissions');
      } else {
        console.log('   ⚠️ No specialized role - no permissions assigned');
        skipped++;
        continue;
      }

      // Update employee
      await EmployeesAcc.updateOne(
        { _id: employee._id },
        { $set: { permissions } }
      );

      console.log('   ✅ Updated permissions in database');
      updated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   Total employees: ${employees.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('='.repeat(60));

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
updateEmployeePermissions();
