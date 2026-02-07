// Test P&F charge minimum quantity fix
const mongoose = require('mongoose');
const ChargePlan = require('./DataBase/Models/DefaultChargePlan');
require('dotenv').config();

async function testPfCharges() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('🧪 Testing P&F Charge Minimum Quantity Fix\n');

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

    const pfMinQty = plan.pakageingandforwarding[0]?.minqty || 1;
    console.log(`\n📊 P&F Minimum Quantity: ${pfMinQty}\n`);

    // Test scenarios
    const testCases = [
      { qty: 3, expected: 0, reason: 'Below minimum' },
      { qty: 39, expected: 0, reason: 'Just below minimum' },
      { qty: 40, expected: 'tier1', reason: 'Exactly at minimum' },
      { qty: 45, expected: 'tier1', reason: 'Within first tier' },
      { qty: 50, expected: 'tier1', reason: 'At first tier max' },
      { qty: 51, expected: 'tier2', reason: 'Start of second tier' },
      { qty: 100, expected: 'tier2', reason: 'Within second tier' },
      { qty: 201, expected: 'tier3', reason: 'Start of third tier' },
    ];

    console.log('🧪 Test Results:\n');
    
    testCases.forEach(test => {
      const pfTier = plan.pakageingandforwarding.find((t) => test.qty >= t.minqty && test.qty <= t.maxqty);
      const packaging = pfTier ? pfTier.cost : 0;
      const pfTotal = test.qty >= pfMinQty ? packaging * test.qty : 0;
      
      let status = '✅';
      let expectedValue = 0;
      
      if (test.expected === 0) {
        expectedValue = 0;
        status = pfTotal === 0 ? '✅' : '❌';
      } else if (test.expected === 'tier1') {
        expectedValue = plan.pakageingandforwarding[0].cost * test.qty;
        status = pfTotal === expectedValue ? '✅' : '❌';
      } else if (test.expected === 'tier2') {
        expectedValue = plan.pakageingandforwarding[1].cost * test.qty;
        status = pfTotal === expectedValue ? '✅' : '❌';
      } else if (test.expected === 'tier3') {
        expectedValue = plan.pakageingandforwarding[2].cost * test.qty;
        status = pfTotal === expectedValue ? '✅' : '❌';
      }
      
      console.log(`${status} Qty ${test.qty}: P&F = ₹${pfTotal} (${test.reason})`);
      if (status === '❌') {
        console.log(`   Expected: ₹${expectedValue}, Got: ₹${pfTotal}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   - P&F charges only apply when qty >= ${pfMinQty}`);
    console.log(`   - Quantities below ${pfMinQty} have P&F = ₹0`);
    console.log(`   - Quantities >= ${pfMinQty} use tier-based pricing`);
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n✅ Test complete');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPfCharges();
