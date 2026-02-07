// Test P&F and Printing charge minimum quantity fix
const mongoose = require('mongoose');
const ChargePlan = require('./DataBase/Models/DefaultChargePlan');
require('dotenv').config();

async function testAllCharges() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('🧪 Testing P&F and Printing Charge Minimum Quantity Fix\n');

    const plan = await ChargePlan.findOne();
    
    if (!plan) {
      console.log('❌ No charge plan found in database');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Current P&F Tiers:');
    plan.pakageingandforwarding.forEach((tier, idx) => {
      console.log(`   Tier ${idx + 1}: ${tier.minqty}-${tier.maxqty} units = ₹${tier.cost} per unit`);
    });

    console.log('\n📋 Current Printing Tiers:');
    plan.printingcost.forEach((tier, idx) => {
      console.log(`   Tier ${idx + 1}: ${tier.minqty}-${tier.maxqty} units = ₹${tier.cost} per unit`);
    });

    const pfMinQty = plan.pakageingandforwarding[0]?.minqty || 1;
    const printMinQty = plan.printingcost[0]?.minqty || 1;
    
    console.log(`\n📊 Minimum Quantities:`);
    console.log(`   P&F: ${pfMinQty}`);
    console.log(`   Printing: ${printMinQty}\n`);

    // Test scenarios
    const testCases = [
      { qty: 1, desc: 'Very low quantity' },
      { qty: 3, desc: 'Below both minimums' },
      { qty: 4, desc: 'Just below printing minimum' },
      { qty: 5, desc: 'At printing minimum' },
      { qty: 10, desc: 'Above printing, below P&F' },
      { qty: 39, desc: 'Just below P&F minimum' },
      { qty: 40, desc: 'At P&F minimum' },
      { qty: 45, desc: 'Within first tier (both)' },
      { qty: 100, desc: 'Within second tier (both)' },
      { qty: 201, desc: 'Within third tier (both)' },
    ];

    console.log('🧪 Test Results:\n');
    console.log('Qty | P&F Charge | Printing Charge | Description');
    console.log('-'.repeat(70));
    
    testCases.forEach(test => {
      // P&F calculation
      const pfTier = plan.pakageingandforwarding.find((t) => test.qty >= t.minqty && test.qty <= t.maxqty);
      const packaging = pfTier ? pfTier.cost : 0;
      const pfTotal = test.qty >= pfMinQty ? packaging * test.qty : 0;
      
      // Printing calculation
      const printTier = plan.printingcost.find((t) => test.qty >= t.minqty && test.qty <= t.maxqty);
      const printing = printTier ? printTier.cost : 0;
      const printTotal = test.qty >= printMinQty ? printing * test.qty : 0;
      
      // Status indicators
      const pfStatus = test.qty < pfMinQty ? '(Below min)' : '✓';
      const printStatus = test.qty < printMinQty ? '(Below min)' : '✓';
      
      console.log(
        `${String(test.qty).padStart(3)} | ` +
        `₹${String(pfTotal).padStart(4)} ${pfStatus.padEnd(11)} | ` +
        `₹${String(printTotal).padStart(4)} ${printStatus.padEnd(11)} | ` +
        `${test.desc}`
      );
    });

    console.log('\n' + '='.repeat(70));
    console.log('📊 Summary:');
    console.log(`   - P&F charges only apply when qty >= ${pfMinQty}`);
    console.log(`   - Printing charges only apply when qty >= ${printMinQty}`);
    console.log(`   - Quantities below minimum have charge = ₹0`);
    console.log(`   - Quantities >= minimum use tier-based pricing`);
    console.log('='.repeat(70));

    // Verify specific cases
    console.log('\n✅ Verification:');
    
    const verifyCase = (qty, expectedPf, expectedPrint, label) => {
      const pfTier = plan.pakageingandforwarding.find((t) => qty >= t.minqty && qty <= t.maxqty);
      const packaging = pfTier ? pfTier.cost : 0;
      const pfTotal = qty >= pfMinQty ? packaging * qty : 0;
      
      const printTier = plan.printingcost.find((t) => qty >= t.minqty && qty <= t.maxqty);
      const printing = printTier ? printTier.cost : 0;
      const printTotal = qty >= printMinQty ? printing * qty : 0;
      
      const pfMatch = pfTotal === expectedPf;
      const printMatch = printTotal === expectedPrint;
      const status = pfMatch && printMatch ? '✅' : '❌';
      
      console.log(`${status} ${label}:`);
      console.log(`   Qty ${qty}: P&F = ₹${pfTotal} (expected ₹${expectedPf}), Printing = ₹${printTotal} (expected ₹${expectedPrint})`);
      
      return pfMatch && printMatch;
    };
    
    const allPass = [
      verifyCase(3, 0, 0, 'Below both minimums'),
      verifyCase(5, 0, 0, 'Below printing minimum (25)'),
      verifyCase(10, 0, 0, 'Below printing minimum (25)'),
      verifyCase(25, 0, 350, 'At printing minimum, below P&F'),
      verifyCase(40, 320, 560, 'At P&F minimum'),
      verifyCase(100, 100, 1400, 'Within second tier'),
    ].every(Boolean);

    console.log('\n' + (allPass ? '✅ All tests PASSED!' : '❌ Some tests FAILED!'));

    await mongoose.disconnect();
    console.log('\n✅ Test complete');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAllCharges();
