const Wallet = require("../DataBase/Models/Wallet");

// 🔹 Get user wallet
const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId }).populate("transactions.order");
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Create transaction (handles both credit & debit and updates balance)

async function createTransaction(userId, orderId, amount, type) {
  // For 50% payment, the remaining balance due is 50% of total
  const remainingDue = type === "50%" ? Math.ceil(amount / 2) : 0;

  const allowedTypes = new Set(["50%", "100%", "MISC"]);
  if (!allowedTypes.has(String(type))) {
    throw new Error(`Invalid transaction type: ${type}`);
  }

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
      ? `50% advance paid (₹${Math.ceil(amount / 2).toLocaleString()}). Remaining ₹${remainingDue.toLocaleString()} due before delivery.`
      : `Full payment of ₹${amount.toLocaleString()} completed.`,
    createdAt: new Date(),
  });

  await wallet.save();
  console.log(`💰 Wallet updated for user ${userId}: Balance = ₹${wallet.balance}, Type = ${type}`);
  return true;
}

module.exports = { createTransaction ,getWallet };