require('dotenv').config();

const connectDb = require('./DataBase/DBConnection');
const Order = require('./DataBase/Models/OrderModel');
const aiSensyService = require('./Service/AiSensyService');

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function pickOrderPhone(order) {
  return (
    order?.addresses?.billing?.mobileNumber ||
    order?.address?.mobileNumber ||
    order?.user?.phone ||
    null
  );
}

function pickOrderName(order) {
  return (
    order?.addresses?.billing?.fullName ||
    order?.address?.fullName ||
    order?.user?.name ||
    null
  );
}

async function main() {
  const orderId = getArgValue('orderId');
  const phone = getArgValue('phone');
  const name = getArgValue('name');
  const amount = getArgValue('amount');

  if (!orderId && !phone) {
    console.error('Provide --orderId or --phone to send AiSensy test.');
    process.exit(1);
  }

  await connectDb();

  let order = null;
  if (orderId) {
    const isObjectId = /^[a-f0-9]{24}$/i.test(orderId);
    order = isObjectId
      ? await Order.findById(orderId).catch(() => null)
      : await Order.findOne({ orderId }).catch(() => null);
  }

  const finalPhone = phone || pickOrderPhone(order);
  const finalName = name || pickOrderName(order) || 'Customer';
  const finalAmount = amount || order?.price || order?.totalPay || '0.00';
  const resolvedOrderId = order?.orderId || order?._id || orderId || 'unknown';

  if (!finalPhone) {
    console.error('No phone number found. Provide --phone or a valid --orderId.');
    process.exit(1);
  }

  console.log('Testing AiSensy with:', {
    orderId: resolvedOrderId,
    phone: finalPhone,
    name: finalName,
    amount: finalAmount,
  });

  const result = await aiSensyService.sendAiSensyOrderMessage({
    phoneNumber: finalPhone,
    customerName: finalName,
    orderId: resolvedOrderId,
    finalAmount: String(finalAmount),
  });

  console.log('AiSensy result:', result);
  process.exit(result?.success ? 0 : 1);
}

main().catch((err) => {
  console.error('AiSensy test failed:', err.message);
  process.exit(1);
});
