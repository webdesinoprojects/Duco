/**
 * Test script to verify order processing fix
 * Tests duplicate detection and retry logic
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://duco-67o5.onrender.com';

// Test order data
const testOrderData = {
  items: [
    {
      productId: '507f1f77bcf86cd799439011',
      name: 'Test T-Shirt',
      color: 'White',
      quantity: { M: 1 },
      price: 500,
      printroveVariantsBySize: { M: 22094474 }
    }
  ],
  address: {
    fullName: 'Test User',
    email: 'test@example.com',
    mobileNumber: '9876543210',
    houseNumber: '123',
    street: 'Test Street',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    country: 'India'
  },
  user: {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test User',
    email: 'test@example.com'
  },
  totalPay: 525
};

async function testNormalOrder() {
  console.log('\n✅ Test 1: Normal Order Processing');
  console.log('=====================================');
  
  const paymentId = `test_normal_${Date.now()}`;
  
  try {
    const response = await axios.post(`${API_BASE}/api/completedorder`, {
      paymentId,
      orderData: testOrderData,
      paymentmode: 'online',
      compressed: false
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', {
      success: response.data.success,
      hasOrder: !!response.data.order,
      orderId: response.data.order?._id,
      duplicate: response.data.duplicate
    });
    
    if (response.data.success && response.data.order) {
      console.log('✅ Test 1 PASSED: Order created successfully');
      return response.data.order._id;
    } else {
      console.log('❌ Test 1 FAILED: Order not created');
      return null;
    }
  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.response?.data || error.message);
    return null;
  }
}

async function testDuplicateRequest() {
  console.log('\n✅ Test 2: Duplicate Request Handling');
  console.log('=====================================');
  
  const paymentId = `test_duplicate_${Date.now()}`;
  
  try {
    // First request
    console.log('📤 Sending first request...');
    const response1 = await axios.post(`${API_BASE}/api/completedorder`, {
      paymentId,
      orderData: testOrderData,
      paymentmode: 'online',
      compressed: false
    });
    
    console.log('First Response:', {
      status: response1.status,
      success: response1.data.success,
      orderId: response1.data.order?._id
    });
    
    // Wait 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Second request (duplicate)
    console.log('📤 Sending duplicate request...');
    const response2 = await axios.post(`${API_BASE}/api/completedorder`, {
      paymentId,
      orderData: testOrderData,
      paymentmode: 'online',
      compressed: false
    });
    
    console.log('Second Response:', {
      status: response2.status,
      success: response2.data.success,
      duplicate: response2.data.duplicate,
      hasOrder: !!response2.data.order,
      orderId: response2.data.order?._id
    });
    
    // Verify duplicate was detected and order was returned
    if (response2.data.duplicate && response2.data.order) {
      console.log('✅ Test 2 PASSED: Duplicate detected and existing order returned');
      return true;
    } else if (response2.status === 202 && response2.data.processing) {
      console.log('✅ Test 2 PASSED: Duplicate detected, order still processing (202 status)');
      return true;
    } else {
      console.log('❌ Test 2 FAILED: Duplicate not handled correctly');
      return false;
    }
  } catch (error) {
    // Check if it's a 202 response (still processing)
    if (error.response?.status === 202 && error.response?.data?.processing) {
      console.log('✅ Test 2 PASSED: Duplicate detected, order still processing (202 status)');
      return true;
    }
    
    console.error('❌ Test 2 FAILED:', error.response?.data || error.message);
    return false;
  }
}

async function testImmediateDuplicate() {
  console.log('\n✅ Test 3: Immediate Duplicate Request (Race Condition)');
  console.log('========================================================');
  
  const paymentId = `test_race_${Date.now()}`;
  
  try {
    // Send two requests simultaneously
    console.log('📤 Sending two simultaneous requests...');
    const [response1, response2] = await Promise.allSettled([
      axios.post(`${API_BASE}/api/completedorder`, {
        paymentId,
        orderData: testOrderData,
        paymentmode: 'online',
        compressed: false
      }),
      axios.post(`${API_BASE}/api/completedorder`, {
        paymentId,
        orderData: testOrderData,
        paymentmode: 'online',
        compressed: false
      })
    ]);
    
    console.log('First Response:', {
      status: response1.status,
      value: response1.value?.data ? {
        success: response1.value.data.success,
        duplicate: response1.value.data.duplicate,
        hasOrder: !!response1.value.data.order
      } : 'rejected'
    });
    
    console.log('Second Response:', {
      status: response2.status,
      value: response2.value?.data ? {
        success: response2.value.data.success,
        duplicate: response2.value.data.duplicate,
        processing: response2.value.data.processing,
        hasOrder: !!response2.value.data.order
      } : response2.reason?.response?.data || 'rejected'
    });
    
    // At least one should succeed
    const hasSuccess = response1.status === 'fulfilled' || response2.status === 'fulfilled';
    
    // Second should be duplicate or processing
    const secondIsDuplicateOrProcessing = 
      response2.value?.data?.duplicate || 
      response2.value?.data?.processing ||
      response2.reason?.response?.data?.processing;
    
    if (hasSuccess && secondIsDuplicateOrProcessing) {
      console.log('✅ Test 3 PASSED: Race condition handled correctly');
      return true;
    } else {
      console.log('❌ Test 3 FAILED: Race condition not handled correctly');
      return false;
    }
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
    return false;
  }
}

async function testExistingOrderLookup() {
  console.log('\n✅ Test 4: Existing Order Lookup');
  console.log('=====================================');
  
  const paymentId = `test_existing_${Date.now()}`;
  
  try {
    // Create order first
    console.log('📤 Creating initial order...');
    const response1 = await axios.post(`${API_BASE}/api/completedorder`, {
      paymentId,
      orderData: testOrderData,
      paymentmode: 'online',
      compressed: false
    });
    
    const orderId = response1.data.order?._id;
    console.log('Order created:', orderId);
    
    // Wait for order to be fully created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to create again with same payment ID
    console.log('📤 Attempting to create duplicate order...');
    const response2 = await axios.post(`${API_BASE}/api/completedorder`, {
      paymentId,
      orderData: testOrderData,
      paymentmode: 'online',
      compressed: false
    });
    
    console.log('Second Response:', {
      success: response2.data.success,
      duplicate: response2.data.duplicate,
      orderId: response2.data.order?._id,
      sameOrder: response2.data.order?._id === orderId
    });
    
    if (response2.data.success && response2.data.order?._id === orderId) {
      console.log('✅ Test 4 PASSED: Existing order returned correctly');
      return true;
    } else {
      console.log('❌ Test 4 FAILED: Existing order not returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Test 4 FAILED:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🧪 Order Processing Fix - Test Suite');
  console.log('======================================\n');
  console.log(`Testing against: ${API_BASE}`);
  console.log('Make sure the backend server is running!\n');
  
  const results = {
    test1: await testNormalOrder(),
    test2: await testDuplicateRequest(),
    test3: await testImmediateDuplicate(),
    test4: await testExistingOrderLookup()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log('Test 1 (Normal Order):', results.test1 ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 2 (Duplicate Request):', results.test2 ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 3 (Race Condition):', results.test3 ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 4 (Existing Order):', results.test4 ? '✅ PASSED' : '❌ FAILED');
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed! Order processing fix is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
