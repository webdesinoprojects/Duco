const mongoose = require('mongoose');
require('dotenv').config();
const Wallet = require('./DataBase/Models/Wallet');
const Order = require('./DataBase/Models/OrderModel');

async function updateExistingWalletTransactions() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    console.log('━'.repeat(80));
    console.log('🔄 Updating Existing Wallet Transactions');
    console.log('━'.repeat(80));
    console.log();

    // Get all wallets
    const wallets = await Wallet.find({});
    console.log(`Found ${wallets.length} wallets\n`);

    let updatedCount = 0;
    
    for (const wallet of wallets) {
      let walletModified = false;
      
      for (const transaction of wallet.transactions) {
        // Only process 50% transactions that are currently Pending
        if ((transaction.type === "50%" || String(transaction.type).includes("50")) && 
            transaction.status === "Pending") {
          
          // Check if the order is actually fully paid
          const order = await Order.findById(transaction.order);
          
          if (order) {
            const isPaid = String(order.paymentStatus || '').toLowerCase() === 'paid';
            const noRemaining = Number(order.remainingAmount || 0) === 0;
            
            if (isPaid && noRemaining) {
              console.log(`📝 Order ${order.orderId || order._id} is fully paid`);
              console.log(`   Updating wallet transaction status from "Pending" to "Paid Fully"`);
              
              transaction.status = 'Paid Fully';
              transaction.note = `Payment completed. Total amount: ₹${Number(order.totalAmount || 0).toLocaleString()}`;
              walletModified = true;
              updatedCount++;
            } else {
              console.log(`⚠️  Order ${order.orderId || order._id} still has payment pending`);
              console.log(`   Status: ${order.paymentStatus}, Remaining: ₹${order.remainingAmount || 0}`);
            }
          } else {
            console.warn(`❌ Order not found for transaction: ${transaction.order}`);
          }
        }
      }
      
      if (walletModified) {
        // Reset balance to 0 for fully paid orders
        wallet.balance = 0;
        await wallet.save();
        console.log(`✅ Wallet updated for user: ${wallet.user}`);
        console.log();
      }
    }

    console.log('━'.repeat(80));
    console.log(`✅ Update Complete: ${updatedCount} transactions updated`);
    console.log('━'.repeat(80));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateExistingWalletTransactions();
