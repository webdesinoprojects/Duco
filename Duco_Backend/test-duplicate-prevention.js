// Test script to verify duplicate order prevention
const axios = require('axios');

async function testDuplicatePrevention() {
  const testPayload = {
    paymentId: 'test_duplicate_' + Date.now(),
    paymentmode: 'online',
    orderData: {
      items: [{
        _id: '68e4c768e3b0dbf6ebe64b8f',
        products_name: 'Test Product',
        price: 1,
        quantity: { 'L': 1 }
      }],
      address: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '9999999999',
        houseNumber: '123',
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        country: 'India'
      },
      user: 'test_user_id',
      totalPay: 1
    }
  };

  console.log('🧪 Testing duplicate order prevention...');
  console.log('Payment ID:', testPayload.paymentId);

  try {
    // Make first request
    console.log('\n1️⃣ Making first request...');
    const response1 = await axios.post('https://duco-67o5.onrender.com/api/completedorder', testPayload);
    console.log('First request result:', {
      success: response1.data.success,
      orderId: response1.data.order?._id,
      duplicate: response1.data.duplicate
    });

    // Make second request immediately (should be prevented)
    console.log('\n2️⃣ Making duplicate request immediately...');
    const response2 = await axios.post('https://duco-67o5.onrender.com/api/completedorder', testPayload);
    console.log('Second request result:', {
      success: response2.data.success,
      duplicate: response2.data.duplicate,
      message: response2.data.message
    });

    // Wait 2 seconds and try again (should still be prevented)
    console.log('\n3️⃣ Waiting 2 seconds and trying again...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response3 = await axios.post('https://duco-67o5.onrender.com/api/completedorder', testPayload);
    console.log('Third request result:', {
      success: response3.data.success,
      duplicate: response3.data.duplicate,
      message: response3.data.message
    });

    console.log('\n✅ Duplicate prevention test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDuplicatePrevention();