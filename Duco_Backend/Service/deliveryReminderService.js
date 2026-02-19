const Order = require('../DataBase/Models/OrderModel');
const emailService = require('./EmailService');

/**
 * Delivery Reminder Service
 * Finds orders due for delivery in 24-48 hours and sends "Coming Soon" reminder emails.
 */

/**
 * Get start of day in local time (UTC date at 00:00:00 for comparison)
 */
function getStartOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Find orders where deliveryExpectedDate is tomorrow or day after tomorrow.
 * Excludes Delivered and Cancelled.
 */
async function getOrdersDueForReminder() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 2);

  const tomorrowStart = getStartOfDayUTC(tomorrow);
  const dayAfterTomorrowEnd = getStartOfDayUTC(dayAfterTomorrow);
  const endExclusive = new Date(dayAfterTomorrowEnd);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const orders = await Order.find({
    status: { $nin: ['Delivered', 'Cancelled'] },
    deliveryExpectedDate: {
      $gte: tomorrowStart,
      $lt: endExclusive,
    },
  })
    .select('orderId _id products addresses address user deliveryExpectedDate status paymentmode advancePaidAmount totalAmount totalPay')
    .lean();

  return orders;
}

/**
 * Build product summary: first 2 item names, then "and X more" if applicable.
 */
function getProductSummary(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return 'Your order items';
  }
  const names = products
    .map((p) => p.products_name || p.name || p.product_name || 'Item')
    .filter(Boolean);
  if (names.length === 0) return 'Your order items';
  const firstTwo = names.slice(0, 2);
  const rest = names.length - 2;
  if (rest <= 0) return firstTwo.join(', ');
  return `${firstTwo.join(', ')} and ${rest} more`;
}

/**
 * Format delivery date for display: e.g. "Friday, 20th Oct"
 */
function formatDeliveryDate(date) {
  if (!date) return 'Soon';
  const d = new Date(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[d.getDay()];
  const dateNum = d.getDate();
  const suffix = dateNum === 1 || dateNum === 21 || dateNum === 31 ? 'st' : dateNum === 2 || dateNum === 22 ? 'nd' : dateNum === 3 || dateNum === 23 ? 'rd' : 'th';
  const month = months[d.getMonth()];
  return `${dayName}, ${dateNum}${suffix} ${month}`;
}

/**
 * Get customer email from order (billing or legacy address).
 */
function getCustomerEmail(order) {
  return (
    order.addresses?.billing?.email ||
    order.address?.email ||
    order.addresses?.shipping?.email ||
    null
  );
}

/**
 * Get customer name from order.
 */
function getCustomerName(order) {
  return (
    order.addresses?.billing?.fullName ||
    order.address?.fullName ||
    'Customer'
  );
}

/**
 * Get display order ID for email.
 */
function getOrderIdDisplay(order) {
  return order.orderId || order._id?.toString() || '—';
}

/**
 * Run daily delivery reminders: find eligible orders and send one email per order.
 * Logs errors per order but does not stop the loop.
 */
async function runDailyReminders() {
  const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://ducoart.com';
  const results = { sent: 0, failed: 0, skipped: 0, errors: [] };

  let orders;
  try {
    orders = await getOrdersDueForReminder();
  } catch (err) {
    console.error('❌ [DeliveryReminder] Failed to fetch orders:', err.message);
    results.errors.push({ step: 'query', message: err.message });
    return results;
  }

  if (!orders.length) {
    console.log('📬 [DeliveryReminder] No orders due for reminder today.');
    return results;
  }

  console.log(`📬 [DeliveryReminder] Found ${orders.length} order(s) due for delivery in 24-48h.`);

  for (const order of orders) {
    const email = getCustomerEmail(order);
    if (!email || !email.trim()) {
      results.skipped++;
      console.warn(`⚠️ [DeliveryReminder] Order ${getOrderIdDisplay(order)}: no customer email, skipped.`);
      continue;
    }

    const orderIdDisplay = getOrderIdDisplay(order);
    const trackOrderUrl = `${baseUrl.replace(/\/$/, '')}/get/logistics/${order._id}`;
    const walletUrl = `${baseUrl.replace(/\/$/, '')}/account/wallet`;
    const deliveryDateFormatted = formatDeliveryDate(order.deliveryExpectedDate);
    const productSummary = getProductSummary(order.products);
    const customerName = getCustomerName(order);

    const grandTotal = Number(order.totalAmount ?? order.totalPay ?? 0);
    const paidAmount = Number(order.advancePaidAmount ?? 0);
    const hasPendingBalance = order.paymentmode === '50%' && Number.isFinite(grandTotal) && Number.isFinite(paidAmount) && paidAmount < grandTotal;

    try {
      const sent = await emailService.sendDeliveryReminder({
        to: email.trim(),
        customerName,
        orderId: orderIdDisplay,
        deliveryDateFormatted,
        productSummary,
        trackOrderUrl,
        hasPendingBalance: hasPendingBalance || false,
        walletUrl: hasPendingBalance ? walletUrl : null,
      });

      if (sent.success) {
        results.sent++;
        console.log(`✅ [DeliveryReminder] Sent to ${email} for order ${orderIdDisplay}`);
      } else {
        results.failed++;
        const msg = sent.error || sent.message || 'Unknown error';
        results.errors.push({ orderId: orderIdDisplay, email, message: msg });
        console.warn(`⚠️ [DeliveryReminder] Order ${orderIdDisplay}: ${msg}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ orderId: orderIdDisplay, email, message: err.message });
      console.error(`❌ [DeliveryReminder] Order ${orderIdDisplay}:`, err.message);
    }
  }

  console.log(`📬 [DeliveryReminder] Done. Sent: ${results.sent}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
  return results;
}

module.exports = {
  getOrdersDueForReminder,
  getProductSummary,
  formatDeliveryDate,
  runDailyReminders,
};
