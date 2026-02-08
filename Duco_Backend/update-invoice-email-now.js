require('dotenv').config();
const mongoose = require('mongoose');
const InvoiceHelper = require('./DataBase/Models/InvoiceHelper');

async function updateInvoiceEmail() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Update the InvoiceHelper singleton
    const result = await InvoiceHelper.updateOne(
      {},
      {
        $set: {
          'company.email': 'Duco@ducoart.com'
        }
      }
    );

    console.log('📧 Invoice Helper Email Update Result:');
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);

    // Verify the update
    const doc = await InvoiceHelper.findOne({});
    if (doc) {
      console.log('\n✅ Current email in database:', doc.company?.email);
    }

    console.log('\n✅ Invoice email updated successfully!');
    console.log('   All new invoices will now show: Duco@ducoart.com');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateInvoiceEmail();
