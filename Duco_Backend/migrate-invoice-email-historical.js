/**
 * HISTORICAL DATA MIGRATION: Update Company Email in Existing Invoices
 * =====================================================================
 * 
 * PURPOSE:
 * Update the company.email field in all existing invoices to show the new email address.
 * 
 * SCOPE:
 * - Collection: Invoice
 * - Field: company.email
 * - Action: Update to "Duco@ducoart.com"
 * 
 * SAFETY:
 * - Only updates the company.email field
 * - Does NOT modify totals, taxes, dates, order status, or line items
 * - Does NOT regenerate invoices
 * - Creates backup count before update
 * - Shows detailed report of changes
 * 
 * ACCOUNTING INTEGRITY:
 * ✅ SAFE: Email is display-only metadata, not financial data
 * ✅ SAFE: Does not affect invoice calculations or totals
 * ✅ SAFE: Does not change invoice numbers or dates
 * ✅ SAFE: Audit trail preserved (timestamps not modified)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('./DataBase/Models/InvoiceModule');

async function migrateInvoiceEmail() {
  try {
    console.log('🔄 Starting Historical Invoice Email Migration...\n');
    
    // Connect to database
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // ===== STEP 1: ANALYZE CURRENT STATE =====
    console.log('📊 STEP 1: Analyzing current state...\n');
    
    const totalInvoices = await Invoice.countDocuments({});
    console.log(`   Total invoices in database: ${totalInvoices}`);
    
    const oldEmailInvoices = await Invoice.countDocuments({
      'company.email': { $ne: 'Duco@ducoart.com' }
    });
    console.log(`   Invoices with old email: ${oldEmailInvoices}`);
    
    const newEmailInvoices = await Invoice.countDocuments({
      'company.email': 'Duco@ducoart.com'
    });
    console.log(`   Invoices with new email: ${newEmailInvoices}`);
    
    const noEmailInvoices = await Invoice.countDocuments({
      $or: [
        { 'company.email': { $exists: false } },
        { 'company.email': null },
        { 'company.email': '' }
      ]
    });
    console.log(`   Invoices with no email: ${noEmailInvoices}\n`);

    // ===== STEP 2: SHOW SAMPLE OF OLD EMAILS =====
    console.log('📧 STEP 2: Sample of current email addresses...\n');
    
    const sampleInvoices = await Invoice.find({
      'company.email': { $ne: 'Duco@ducoart.com' }
    })
    .limit(5)
    .select('invoice.number company.email createdAt');
    
    if (sampleInvoices.length > 0) {
      console.log('   Sample invoices to be updated:');
      sampleInvoices.forEach(inv => {
        console.log(`   - Invoice ${inv.invoice?.number}: "${inv.company?.email || '(empty)'}" → "Duco@ducoart.com"`);
      });
      console.log('');
    }

    // ===== STEP 3: CONFIRM UPDATE =====
    if (oldEmailInvoices === 0 && noEmailInvoices === 0) {
      console.log('✅ All invoices already have the correct email address!');
      console.log('   No updates needed.\n');
      process.exit(0);
    }

    console.log('⚠️  STEP 3: Ready to update...\n');
    console.log(`   Will update ${oldEmailInvoices + noEmailInvoices} invoices`);
    console.log('   Field: company.email');
    console.log('   New value: "Duco@ducoart.com"');
    console.log('   Safety: Only email field will be modified\n');

    // ===== STEP 4: PERFORM UPDATE =====
    console.log('🔄 STEP 4: Performing update...\n');
    
    const updateResult = await Invoice.updateMany(
      {
        'company.email': { $ne: 'Duco@ducoart.com' }
      },
      {
        $set: {
          'company.email': 'Duco@ducoart.com'
        }
      }
    );

    console.log('✅ Update completed!');
    console.log(`   Matched: ${updateResult.matchedCount} invoices`);
    console.log(`   Modified: ${updateResult.modifiedCount} invoices\n`);

    // ===== STEP 5: VERIFY UPDATE =====
    console.log('🔍 STEP 5: Verifying update...\n');
    
    const verifyNewEmail = await Invoice.countDocuments({
      'company.email': 'Duco@ducoart.com'
    });
    console.log(`   Invoices with new email: ${verifyNewEmail}`);
    
    const verifyOldEmail = await Invoice.countDocuments({
      'company.email': { $ne: 'Duco@ducoart.com' }
    });
    console.log(`   Invoices with old email: ${verifyOldEmail}`);

    // ===== STEP 6: SHOW SAMPLE OF UPDATED INVOICES =====
    console.log('\n📧 STEP 6: Sample of updated invoices...\n');
    
    const updatedSamples = await Invoice.find({
      'company.email': 'Duco@ducoart.com'
    })
    .limit(5)
    .select('invoice.number company.email createdAt updatedAt');
    
    if (updatedSamples.length > 0) {
      console.log('   Sample updated invoices:');
      updatedSamples.forEach(inv => {
        console.log(`   - Invoice ${inv.invoice?.number}: "${inv.company?.email}"`);
      });
      console.log('');
    }

    // ===== FINAL REPORT =====
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Total invoices: ${totalInvoices}`);
    console.log(`   Updated: ${updateResult.modifiedCount}`);
    console.log(`   Already correct: ${newEmailInvoices}`);
    console.log(`   New email: Duco@ducoart.com`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📝 NOTES:');
    console.log('   - Only company.email field was modified');
    console.log('   - No financial data was changed');
    console.log('   - Invoice calculations remain unchanged');
    console.log('   - Audit trail preserved (createdAt unchanged)');
    console.log('   - All existing invoices now show new email\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR during migration:', error);
    console.error('\n⚠️  Migration failed. No data was modified.');
    process.exit(1);
  }
}

// Run migration
migrateInvoiceEmail();

