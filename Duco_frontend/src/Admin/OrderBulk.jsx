import React, { useEffect,useMemo, useState } from "react";
import OrderDetailsCard from "../Admin/Components/OrderDetailsCard"; // <-- make sure path is correct

const statusClass = (s = "") => {
  switch (s) {
    case "Pending": return "bg-amber-500 text-white";
    case "Processing": return "bg-sky-500 text-white";
    case "Shipped": return "bg-purple-500 text-white";
    case "Delivered": return "bg-emerald-500 text-white";
    case "Cancelled": return "bg-rose-500 text-white";
    default: return "bg-gray-400 text-white";
  }
};

const OrderBulk = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [minOrderQty, setMinOrderQty] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const [corporateMinQty, setCorporateMinQty] = useState(100);

  const fetchOrders = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const res = await fetch(`${API_BASE}/api/order?page=1&limit=100`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Handle both old format (array) and new paginated format (object with orders array)
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/bulk-order-settings`);
      if (response.ok) {
        const settings = await response.json();
        setMinOrderQty(settings.minOrderQty || 50);
        setCorporateMinQty(settings.corporateMinQty || 100);
      } else if (response.status === 404) {
        // Settings endpoint doesn't exist yet, use defaults
        console.log('Settings API not available, using defaults');
      }
    } catch (error) {
      // Settings API not available, use defaults
      console.log('Settings API not available, using defaults');
    }
  };

  useEffect(() => {
    fetchOrders();
    loadSettings();
  }, []);

  const bulkOrders = useMemo(() => {
    return (orders ?? []).filter(order => {
      const isCorporate = order.orderType === 'B2B';
      const threshold = isCorporate ? corporateMinQty : minOrderQty;
      
      return (order.products ?? []).some(prod =>
        Object.values(prod?.quantity ?? {}).some(qty => Number(qty) >= threshold)
      );
    });
  }, [orders, minOrderQty, corporateMinQty]);

  console.log(bulkOrders);
  
  if (loading) return <div className="text-center p-4">Loading orders...</div>;

  const saveSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/bulk-order-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          minOrderQty,
          corporateMinQty
        }),
      });
      
      if (response.ok) {
        alert('Settings saved successfully!');
        setShowSettings(false);
      } else if (response.status === 404) {
        alert('Settings API not available. Settings will be used for this session only.');
        setShowSettings(false);
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Settings API not available. Settings will be used for this session only.');
      setShowSettings(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Bulk Orders Management</h2>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">
          Current thresholds: Regular orders ≥ {minOrderQty} units, Corporate orders ≥ {corporateMinQty} units
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Showing {bulkOrders.length} bulk orders out of {orders.length} total orders
        </p>
      </div>

      {bulkOrders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-4">
          {bulkOrders.map((order) => {
            const first = order?.products?.[0] || {};
            return (
              <div
                key={order._id}
                className="bg-white rounded-lg p-4 shadow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Basic info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-500 truncate">#{order._id}</span>
                  </div>

                  <p className="font-semibold text-sm sm:text-base truncate">
                    {first.products_name || "Unnamed product"}
                  </p>

                  <p className="text-xs text-gray-600">
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <p className="text-xs text-gray-700 mt-1">
                    {order?.address?.fullName
                      ? `${order.address.fullName} • ${order.address.city || ""}`
                      : "No address"}
                  </p>

                  {/* Order Type and Quantity Info */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.orderType === 'B2B' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.orderType === 'B2B' ? '🏢 Corporate' : '👤 Retail'}
                    </span>
                    <span className="text-xs text-gray-600">
                      Total Qty: {(order.products ?? []).reduce((total, prod) => 
                        total + Object.values(prod?.quantity ?? {}).reduce((sum, qty) => sum + Number(qty), 0), 0
                      )}
                    </span>
                  </div>
                </div>

                {/* Right: Price + Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <p className="font-semibold text-right">
                    ₹{Number(order.price || 0).toFixed(2)}
                  </p>
                  <button
                    onClick={() => setSelectedOrderId(order._id)}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Order Details */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedOrderId(null)}
          />
          <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Order Details</h3>
              <button
                className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => setSelectedOrderId(null)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <OrderDetailsCard orderId={selectedOrderId} />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Bulk Order Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Quantity (Regular)
                </label>
                <input
                  type="number"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Orders with quantities equal or above this will be considered bulk orders
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Quantity (Corporate)
                </label>
                <input
                  type="number"
                  value={corporateMinQty}
                  onChange={(e) => setCorporateMinQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Corporate orders with quantities equal or above this will be considered bulk orders
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBulk;