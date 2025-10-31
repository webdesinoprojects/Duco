// Utility to clear all order-related cached data
export const clearOrderCache = () => {
  console.log("🧹 Clearing all order-related cache...");
  
  // Clear order-specific localStorage items
  const orderKeys = [
    "lastOrderId",
    "lastOrderMeta", 
    "lastCartCharges",
    "cart"
  ];
  
  orderKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`   ✅ Cleared: ${key}`);
    }
  });
  
  console.log("✅ Order cache cleared successfully");
};

// Clear cache when starting a new design session
export const startFreshDesignSession = () => {
  console.log("🎨 Starting fresh design session...");
  clearOrderCache();
  
  // Set a session marker
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem("currentDesignSession", sessionId);
  
  console.log(`✅ Fresh design session started: ${sessionId}`);
  return sessionId;
};

// Check if we're in the same session
export const isCurrentSession = (sessionId) => {
  const currentSession = sessionStorage.getItem("currentDesignSession");
  return currentSession === sessionId;
};