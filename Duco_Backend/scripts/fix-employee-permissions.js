const mongoose = require('mongoose');
require('dotenv').config();

const EmployeesAcc = require('../DataBase/Models/EmployessAcc');

async function fixEmployeePermissions() {
  try {
    console.log('🔧 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to database');

    // Get all employees
    const employees = await EmployeesAcc.find({});
    console.log(`📋 Found ${employees.length} employees`);

    for (const employee of employees) {
      const role = employee.employeesdetails?.role;
      console.log(`\n👤 Processing: ${employee.employeesdetails?.name} (${employee.employeeid})`);
      console.log(`   Role: ${role}`);
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
        console.log('   ✅ Setting Graphic Designer permissions');
      } else if (role === 'Order Manager') {
        permissions.manageBulkOrder = true;
        permissions.manageOrder = true;
        permissions.logistics = true;
        permissions.setMoney = true;
        permissions.chargesPlan = true;
        permissions.corporateSettings = true;
        console.log('   ✅ Setting Order Manager permissions');
      } else if (role === 'Accounting and Management') {
        permissions.bankDetails = true;
        permissions.employeeManagement = true;
        permissions.userAnalysis = true;
        permissions.invoice = true;
        permissions.sales = true;
        console.log('   ✅ Setting Accounting and Management permissions');
      } else {
        console.log('   ⚠️  Unknown role, no permissions set');
      }

      // Update employee
      await EmployeesAcc.updateOne(
        { _id: employee._id },
        { $set: { permissions } }
      );

      console.log('   ✅ Updated permissions:', permissions);
    }

    console.log('\n✅ All employees updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixEmployeePermissions();
