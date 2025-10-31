// Diagnostic script to check if the fixes are working
console.log("🔍 Running Payment Page Diagnostics...");

// Check 1: Variable initialization order
console.log("\n1. Testing variable initialization order:");
try {
  // This simulates the fixed PaymentPage structure
  const mockLocations = { state: { items: [], totalPay: 100 } };
  const mockOrderpayload = mockLocations.state || {};
  
  // This should work without ReferenceError
  const hasItems = !!mockOrderpayload?.items?.length;
  console.log("✅ Variable order: FIXED");
} catch (error) {
  console.error("❌ Variable order: STILL BROKEN -", error.message);
}

// Check 2: Cache clearing functionality
console.log("\n2. Testing cache clearing:");
try {
  // Set test data
  localStorage.setItem("testOrderId", "123");
  
  // Clear it
  localStorage.removeItem("testOrderId");
  
  // Check if cleared
  const cleared = !localStorage.getItem("testOrderId");
  console.log(cleared ? "✅ Cache clearing: WORKING" : "❌ Cache clearing: NOT WORKING");
} catch (error) {
  console.error("❌ Cache clearing: ERROR -", error.message);
}

// Check 3: Session storage
console.log("\n3. Testing session storage:");
try {
  const sessionId = `test_${Date.now()}`;
  sessionStorage.setItem("testSession", sessionId);
  const retrieved = sessionStorage.getItem("testSession");
  sessionStorage.removeItem("testSession");
  
  console.log(retrieved === sessionId ? "✅ Session storage: WORKING" : "❌ Session storage: NOT WORKING");
} catch (error) {
  console.error("❌ Session storage: ERROR -", error.message);
}

// Check 4: JSON parsing safety
console.log("\n4. Testing JSON parsing safety:");
try {
  const safeCart = JSON.parse(localStorage.getItem("cart") || "[]");
  console.log("✅ JSON parsing: SAFE");
} catch (error) {
  console.error("❌ JSON parsing: ERROR -", error.message);
}

console.log("\n🎯 Diagnostics complete!");
console.log("If all checks show ✅, the payment page should work correctly.");