import React, { useEffect, useState } from "react";
import OrderDetailsCard from "../Admin/Components/OrderDetailsCard"; // ✅ ensure path is correct

// ✅ Better status badge colors
const statusClass = (s = "") => {
  switch (s) {
    case "Pending":
      return "bg-amber-500 text-white";
    case "Processing":
      return "bg-sky-500 text-white";
    case "Shipped":
      return "bg-purple-500 text-white";
    case "Delivered":
      return "bg-emerald-500 text-white";
    case "Cancelled":
      return "bg-rose-500 text-white";
    case "Payment Verification Failed":
      return "bg-red-500 text-white";
    case "Payment Verification Failed (50%)":
      return "bg-orange-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const OderSection = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/order");
      const data = await res.json();

      // ✅ handle both formats {orders: [...]} or [...]
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("❌ Failed to fetch orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center p-4">Loading orders...</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">All Orders</h2>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const first = order?.products?.[0] || order?.items?.[0] || {};
            const email = order?.address?.email || order?.user?.email || "N/A";

            return (
              <div
                key={order._id}
                className="bg-white rounded-lg p-4 shadow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Basic info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      #{order._id}
                    </span>
                  </div>

                  {/* ✅ Show product image + name */}
                  <div className="flex items-center gap-3 mb-1">
                    {first.image && (
                      <img
                        src={first.image}
                        alt={first.name || "Product"}
                        className="w-10 h-10 rounded object-contain border"
                      />
                    )}
                    <p className="font-semibold text-sm sm:text-base truncate">
                      {first.name ||
                        first.products_name ||
                        first.product_name ||
                        "Unnamed product"}
                    </p>
                  </div>

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
                      ? `${order.address.fullName} • ${
                          order.address.city || ""
                        }`
                      : "No address"}
                  </p>

                  <p className="text-xs text-gray-500">📧 {email}</p>
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
    </div>
  );
};

export default OderSection;
