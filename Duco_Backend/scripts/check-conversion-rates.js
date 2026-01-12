#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config({ path: './Duco_Backend/.env' });
const Price = require('../DataBase/Models/MoneyModel');

async function checkRates() {
  try {
    await mongoose.connect(process.env.DB_URL);
    
    const allEntries = await Price.find().select('location currency price_increase');
    
    console.log('\n📊 Current Conversion Rates in Database:\n');
    console.log('Location | Currency | Rate | Markup');
    console.log('---------|----------|------|-------');
    
    allEntries.forEach(e => {
      const rate = e.currency.toconvert;
      const markup = e.price_increase;
      console.log(`${e.location.padEnd(15)} | ${e.currency.country.padEnd(8)} | ${rate} | ${markup}%`);
    });
    
    console.log('\n❌ PROBLEM IDENTIFIED:');
    console.log('The conversion rates are BACKWARDS!');
    console.log('Current: 1 INR = 0.011 EUR (multiply)');
    console.log('Correct: 1 EUR = 90.9 INR (so 1 INR = 1/90.9 = 0.011 EUR)');
    console.log('\nBUT the formula should be: MULTIPLY, not DIVIDE!');
    console.log('Because: 399 INR * 0.011 = 4.39 EUR (correct)');
    console.log('NOT: 399 INR / 0.011 = 36,272 EUR (wrong)');
    
    await mongoose.connection.close();
  } catch(err) {
    console.error('Error:', err.message);
  }
}

checkRates();
