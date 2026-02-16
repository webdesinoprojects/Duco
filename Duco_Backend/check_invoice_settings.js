require('dotenv').config();
const mongoose = require('mongoose');
const InvoiceHelper = require('./DataBase/Models/InvoiceHelper');

async function checkSettings() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    const settings = await InvoiceHelper.findOne({}).lean();
    
    if (!settings) {
      console.log('❌ NO INVOICE SETTINGS FOUND IN DATABASE');
      console.log('\nYou need to create invoice settings. Required fields:');
      console.log('  - company.name');
      console.log('  - company.address');
      console.log('  - company.gstin');
      console.log('  - forCompany');
      process.exit(1);
    }

    console.log('\n✅ Invoice Settings Found:');
    console.log('  Company Name:', settings.company?.name || '❌ MISSING');
    console.log('  Company Address:', settings.company?.address || '❌ MISSING');
    console.log('  Company GSTIN:', settings.company?.gstin || '❌ MISSING');
    console.log('  For Company:', settings.forCompany || '❌ MISSING');
    console.log('  Company GSTIN:', settings.company?.gstin || '❌ MISSING');
    console.log('  Company CIN:', settings.company?.cin || 'Not set');
    console.log('  Company Email:', settings.company?.email || 'Not set');
    console.log('  Company State:', settings.company?.state || 'Not set');

    const missing = [];
    if (!settings.company?.name) missing.push('company.name');
    if (!settings.company?.address) missing.push('company.address');
    if (!settings.company?.gstin) missing.push('company.gstin');
    if (!settings.forCompany) missing.push('forCompany');

    if (missing.length > 0) {
      console.log('\n❌ MISSING REQUIRED FIELDS:', missing.join(', '));
      console.log('\nInvoice creation will FAIL until these are set!');
      process.exit(1);
    }

    console.log('\n✅ All required settings are present!');
    console.log('\nSettings Object:');
    console.log(JSON.stringify(settings, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

checkSettings();
