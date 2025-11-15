// Script to update all invoices with correct company data
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Invoice = require('./DataBase/Models/InvoiceModule');

const CORRECT_COMPANY_DATA = {
  name: "DUCO ART PRIVATE LIMITED",
  address: "SADIJA COMPOUND AVANTI VIHAR LIG 64\nNEAR BANK OF BARODA , RAIPUR C.G",
  gstin: "22AAICD1719N1ZM",
  cin: "U52601CT2020PTC010997",
  email: "ducoart1@gmail.com"
};

const CORRECT_INVOICE_DATA = {
  placeOfSupply: "Chhattisgarh (22)",
  reverseCharge: false,
  copyType: "Original Copy"
};

const CORRECT_TERMS = [
  "Goods once sold will not be taken back.",
  "Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.",
  "Subject to 'Chhattisgarh' Jurisdiction only."
];

const CORRECT_FOR_COMPANY = "DUCO ART PRIVATE LIMITED";

async function updateInvoices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    // Update all invoices
    const result = await Invoice.updateMany(
      {}, // Update all invoices
      {
        $set: {
          'company.name': CORRECT_COMPANY_DATA.name,
          'company.address': CORRECT_COMPANY_DATA.address,
          'company.gstin': CORRECT_COMPANY_DATA.gstin,
          'company.cin': CORRECT_COMPANY_DATA.cin,
          'company.email': CORRECT_COMPANY_DATA.email,
          'invoice.placeOfSupply': CORRECT_INVOICE_DATA.placeOfSupply,
          'invoice.copyType': CORRECT_INVOICE_DATA.copyType,
          'terms': CORRECT_TERMS,
          'forCompany': CORRECT_FOR_COMPANY
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} invoices`);
    console.log('Company data updated to:');
    console.log(CORRECT_COMPANY_DATA);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error updating invoices:', error);
    process.exit(1);
  }
}

updateInvoices();
