import { useEffect, useState } from "react";
import OrderDetailsCard from "../Admin/Components/OrderDetailsCard";
import AdminInvoiceViewer from "../Admin/Components/AdminInvoiceViewer";
import { fetchAndNormalizeInvoice } from "../Admin/utils/invoiceNormalizer";

const statusClass = (s = "") => {
  switch (s) {
    case "Pending": return "bg-amber-500 text-white";
    case "Processing": return "bg-sky-500 text-white";
    case "Shipped": return "bg-purple-500 text-white";
    case "Delivered": return "bg-emerald-500 text-white";
    case "Cancelled": return "bg-rose-500 text-white";
    case "Payment Verification Failed": return "bg-red-500 text-white";
    case "Payment Verification Failed (50%)": return "bg-orange-500 text-white";
    default: return "bg-gray-400 text-white";
  }
};

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
};

// ✅ Format price with proper currency formatting (exact 2 decimals)
const formatPrice = (amount, currency = 'INR') => {
  const symbol = currencySymbols[currency] || currency;
  const num = Number(amount || 0);
  
  // Show exact amount with 2 decimals for all currencies
  return `${symbol}${num.toFixed(2)}`;
};

const OrderBulk = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [invoiceData, setInvoiceData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const itemsPerPage = 10;

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      // ✅ Add cache-busting parameter to force fresh data
      const timestamp = Date.now();
      const res = await fetch(`${API_BASE}/api/order?page=${page}&limit=${itemsPerPage}&orderType=B2B&t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();

      if (Array.isArray(data)) {
        setOrders(data);
        setTotalOrders(data.length);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      } else if (Array.isArray(data.orders)) {
        setOrders(data.orders);
        setTotalOrders(data.total || data.orders.length);
        setTotalPages(data.pages || Math.ceil((data.total || data.orders.length) / itemsPerPage));
      } else {
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(1);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error("❌ Failed to fetch B2B orders", err);
      setOrders([]);
      setTotalOrders(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  if (loading) return <div className="text-center p-4">Loading orders...</div>;

  const handleRefresh = () => {
    fetchOrders(currentPage);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchOrders(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchOrders(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    fetchOrders(page);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const viewInvoice = async (orderId) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      const normalized = await fetchAndNormalizeInvoice(orderId, API_BASE);
      setInvoiceData(normalized);
      setShowInvoiceModal(true);
      setToast({ type: "success", msg: "Invoice loaded" });
    } catch (error) {
      setToast({ type: "error", msg: `Failed to fetch invoice: ${error.message}` });
    }
  };

  return (
    <div className="p-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="ml-3 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">All B2B Orders</h2>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm flex items-center gap-2"
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">
              {selectedOrders.length} selected
            </span>
            <button
              onClick={() => setSelectedOrders([])}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const first = order?.products?.[0] || order?.items?.[0] || {};
              
              // ✅ Handle both old and new address formats
              const addressObj = order?.addresses?.billing || order?.address;
              const email = addressObj?.email || order?.user?.email || "N/A";
              const fullName = addressObj?.fullName || "No name";
              const city = addressObj?.city || "";

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-lg p-4 shadow"
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => toggleOrderSelection(order._id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
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
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {(() => {
                          const currency = order.currency || 'INR';
                          // ✅ Use totalPay/totalAmount from backend for accurate total
                          const baseAmount = Number(order.totalPay || order.totalAmount || order.price || 0);
                          return formatPrice(baseAmount, currency);
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-gray-600">
                        {new Date(order.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-gray-700 mt-1">
                        {fullName !== "No name"
                          ? `${fullName} • ${city}`
                          : "No address"}
                      </p>
                      <p className="text-gray-500">📧 {email}</p>
                    </div>

                    {/* ✅ Payment Information Section */}
                    <div className="bg-gray-50 rounded p-2">
                      {order.paymentmode === '50%' ? (
                        <div className="space-y-1">
                          {(() => {
                            const totalAmount = Number(order.totalPay || order.totalAmount || order.price || 0);
                            const paidAmount = Number(order.advancePaidAmount || order.price || 0);
                            const dueAmount = Number(order.remainingAmount || (totalAmount - paidAmount) || 0);
                            const isFullyPaid = order.remainingPaymentId || (order.remainingAmount !== undefined && order.remainingAmount === 0);
                            
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    isFullyPaid 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {isFullyPaid ? '✅ Fully Paid' : '💰 50% Paid'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-700">
                                  <p>Total: {formatPrice(totalAmount, order.currency || 'INR')}</p>
                                  <p className={`font-medium ${
                                    isFullyPaid ? 'text-green-600' : 'text-orange-600'
                                  }`}>
                                    Paid: {formatPrice(isFullyPaid ? totalAmount : paidAmount, order.currency || 'INR')}
                                  </p>
                                  {!isFullyPaid && (
                                    <p className="text-orange-600 font-medium">Due: {formatPrice(dueAmount, order.currency || 'INR')}</p>
                                  )}
                                  {isFullyPaid && (
                                    <p className="text-xs text-green-600">No pending amount</p>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : order.paymentmode === 'store_pickup' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              🏬 Store Pickup
                            </span>
                          </div>
                          <div className="text-xs text-gray-700">
                            <p>Payment Due: {formatPrice(Number(order.price || 0), order.currency || 'INR')}</p>
                            <p className="text-blue-600 text-xs">At pickup</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">
                          <p>Payment Mode: {order.paymentmode || 'Online'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setSelectedOrderId(order._id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => viewInvoice(order._id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                      title="View Invoice/Bill"
                    >
                      🧾 Invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span> ({totalOrders} total orders)
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

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

      {/* ✅ INVOICE MODAL - Using AdminInvoiceViewer */}
      <AdminInvoiceViewer 
        invoiceData={invoiceData}
        showModal={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
};

export default OrderBulk;
