const Wallet = require("../DataBase/Models/Wallet");

// 🔹 Get user wallet (create if doesn't exist)
const getWallet = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validate userId is provided
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID is required. Please log in to view your wallet." 
      });
    }
    
    // Validate userId format (basic check for MongoDB ObjectId)
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: "Please log in to view your wallet." 
      });
    }
    
    let wallet = await Wallet.findOne({ user: userId }).populate("transactions.order");
    
    // If wallet doesn't exist, create an empty one
    if (!wallet) {
      wallet = new Wallet({ 
        user: userId, 
        balance: 0, 
        transactions: [] 
      });
      await wallet.save();
      console.log(`✅ Created new wallet for user ${userId}`);
    }
    
    // ✅ Recalculate balance from pending transactions (ignore stale DB field)
    const pendingBalance = (wallet.transactions || [])
      .filter(tx => String(tx?.status || "").toLowerCase() === "pending")
      .reduce((sum, tx) => sum + Number(tx?.amount || 0), 0);
    
    // Update balance in response (don't save to DB to avoid race conditions)
    const walletObj = wallet.toObject();
    walletObj.balance = Number(pendingBalance.toFixed(2));
    
    res.json({ success: true, data: walletObj });
  } catch (err) {
    console.error("❌ Wallet error:", err.message);
    res.status(500).json({ 
      success: false,
      message: "Please log in to view your wallet" 
    });
  }
};

// 🔹 Create transaction (handles both credit & debit and updates balance)

async function createTransaction(userId, orderId, amount, type, currency = 'INR') {
  // For 50% payment, the remaining balance due is 50% of total (preserve 2 decimal places)
  const remainingDue = type === "50%" ? Number((amount / 2).toFixed(2)) : 0;

  const allowedTypes = new Set(["50%", "100%", "MISC"]);
  if (!allowedTypes.has(String(type))) {
    throw new Error(`Invalid transaction type: ${type}`);
  }

  // ✅ Map currency to symbol
  const currencySymbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'AED': 'د.إ',
    'GBP': '£',
    'AUD': 'A$',
    'CAD': 'C$',
    'SGD': 'S$',
    'JPY': '¥',
  };
  
  const currencySymbol = currencySymbols[String(currency || 'INR').toUpperCase()] || '₹';

  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
  }

  // For 50% payment: add remaining due to balance (customer owes this amount)
  // For 100% payment: no balance change
  if (type === "50%") {
    wallet.balance = (wallet.balance || 0) + remainingDue;
  }

  // Record transaction
  wallet.transactions.push({
    order: orderId,
    amount: remainingDue, // Amount due (positive = customer owes)
    type,
    status: type === "50%" ? "Pending" : "Completed",
    note: type === "50%" 
      ? `50% advance paid (${currencySymbol}${Number((amount / 2).toFixed(2)).toLocaleString()}). Remaining ${currencySymbol}${remainingDue.toLocaleString()} due before delivery.`
      : `Full payment of ${currencySymbol}${amount.toLocaleString()} completed.`,
    createdAt: new Date(),
  });

  await wallet.save();
  console.log(`💰 Wallet updated for user ${userId}: Balance = ${currencySymbol}${wallet.balance}, Type = ${type}, Currency = ${currency}`);
  return true;
}

module.exports = { createTransaction ,getWallet };