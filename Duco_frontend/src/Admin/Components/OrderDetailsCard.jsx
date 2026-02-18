import { useState, useEffect } from "react";
import { getLogisticsByOrder } from "../../Service/logisticsApi";
import DesignPreviewModal from "./DesignPreviewModal";
import { API_BASE_URL } from "../../config/api";

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL", "3XL"];

// ✅ Currency symbols map
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

// ✅ Format currency based on order's currency
const formatCurrency = (amount, currency = 'INR') => {
  const symbol = currencySymbols[currency] || '₹';
  const value = Number(amount || 0);
  
  // ✅ Fix: Show 2 decimal places for all currencies to ensure math adds up
  // Prevents confusion like ₹8 + ₹0 = ₹9
  return `${symbol}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

function sortedEntries(quantity = {}) {
  return Object.entries(quantity || {}).sort(
    ([a], [b]) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  );
}

function totalQty(quantity = {}) {
  return Object.values(quantity || {}).reduce((s, n) => s + Number(n || 0), 0);
}

function QuantityChips({ quantity }) {
  const entries = sortedEntries(quantity);
  if (!entries.length) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([size, count]) =>
        Number(count) > 0 ? (
          <span key={size} className="px-1 py-0.5 text-xs rounded border">
            {size} × {count}
          </span>
        ) : null
      )}
    </div>
  );
}

const OrderDetailsCard = ({ orderId }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]); // ✅ store all products
  const [logistics, setLogistics] = useState([]); // ✅ store logistics data
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false); // ✅ Design modal state
  const [customerInfo, setCustomerInfo] = useState(null); // ✅ Store customer info

  const statusOptions = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  const handleStatusChange = async (newStatus) => {
    setOrder((prev) => ({ ...prev, status: newStatus }));
    try {
      await fetch(
        `${API_BASE_URL}/api/order/update/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // ✅ Handle delivery date update
  const handleDeliveryDateChange = async (newDate) => {
    setOrder((prev) => ({ ...prev, deliveryExpectedDate: newDate }));
    try {
      await fetch(
        `${API_BASE_URL}/api/order/update/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryExpectedDate: newDate }),
        }
      );
    } catch (err) {
      console.error("Failed to update delivery date", err);
      alert("Failed to update delivery date");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Processing":
        return "bg-blue-100 text-blue-800";
      case "Shipped":
        return "bg-indigo-100 text-indigo-800";
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // ✅ Fetch order
  useEffect(() => {
    (async () => {
      try {
        console.log("📡 Fetching order:", orderId);
        const res = await fetch(
          `${API_BASE_URL}/api/order/${orderId}`
        );
        const data = await res.json();
        console.log("🧾 Order fetched:", data);
        setOrder(data);
      } catch (err) {
        console.error("❌ Failed to fetch order:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // ✅ Fetch customer info from userId if it's just an ID
  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!order?.userId) return;
      
      try {
        // If userId is already an object, no need to fetch
        if (typeof order.userId === 'object') {
          setCustomerInfo(order.userId);
          return;
        }
        
        // If userId is a string, fetch the user details
        if (typeof order.userId === 'string') {
          const res = await fetch(
            `${API_BASE_URL}/api/users/${order.userId}`
          );
          if (!res.ok) {
            console.warn("Failed to fetch customer info");
            return;
          }
          const userData = await res.json();
          setCustomerInfo(userData?.data || userData);
        }
      } catch (err) {
        console.error("❌ Failed to fetch customer info:", err);
      }
    };
    fetchCustomerInfo();
  }, [order?.userId]);

  // ✅ Fetch all products (for fallback images)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        const data = await res.json();
        if (Array.isArray(data)) setAllProducts(data);
      } catch (err) {
        console.error("❌ Failed to fetch product list", err);
      }
    };
    fetchProducts();
  }, []);

  // ✅ Fetch logistics data for B2B orders
  useEffect(() => {
    const fetchLogistics = async () => {
      if (!orderId) return;
      try {
        setLogisticsLoading(true);
        const data = await getLogisticsByOrder(orderId, { populate: true });
        console.log('📦 Logistics data fetched:', data);
        setLogistics(Array.isArray(data) ? data : (data?.logistics ?? []));
      } catch (err) {
        console.error("❌ Failed to fetch logistics:", err);
        setLogistics([]);
      } finally {
        setLogisticsLoading(false);
      }
    };
    fetchLogistics();
  }, [orderId]);

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!order) return <div className="p-4 text-center">Order not found</div>;

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Order #{order._id}
          </h2>
          <p className="text-gray-600">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
              order.status
            )}`}
          >
            {order.status}
          </span>
          {/* ✅ Design Preview Button - Always show for orders with products */}
          {order.products && order.products.length > 0 && (
            <button
              onClick={() => setShowDesignModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              👁️ View Design
            </button>
          )}
          <select
            value={order.status ?? ""}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer / Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
          <div className="space-y-1">
            <p>{
              customerInfo?.name || 
              customerInfo?.fullName ||
              order.userId?.name ||
              order.userId?.fullName ||
              order.address?.fullName || 
              'N/A'
            }</p>
            <p className="text-blue-600">{
              customerInfo?.phone ||
              customerInfo?.email ||
              order.userId?.phone ||
              order.address?.mobileNumber || 
              'N/A'
            }</p>
            <p className="text-gray-600">{
              customerInfo?.email ||
              order.userId?.email ||
              order.address?.email ||
              'N/A'
            }</p>
            <p className="text-gray-600">
              {order.address?.houseNumber}, {order.address?.street},{" "}
              {order.address?.city}, {order.address?.state} -{" "}
              {order.address?.pincode}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Payment & Delivery</h3>
          <div className="space-y-2">
            <p>
              Total Amount: {formatCurrency(
                Number(order.totalPay || order.totalAmount || order.price || order.amount || 0), 
                order.currency
              )}
            </p>
            
            {/* ✅ 50% Payment Information */}
            {order.paymentmode === '50%' && (() => {
              const totalAmount = Number(order.totalPay || order.totalAmount || order.price || order.amount || 0);
              const paidAmount = Number(order.advancePaidAmount || order.price || order.amount || 0);
              const dueAmount = Number(order.remainingAmount || (totalAmount - paidAmount) || 0);
              const isFullyPaid = order.remainingPaymentId || (order.remainingAmount !== undefined && order.remainingAmount === 0);
              
              return (
                <div className={`border rounded p-3 my-2 ${
                  isFullyPaid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <p className={`text-sm font-semibold ${
                    isFullyPaid ? 'text-green-800' : 'text-orange-800'
                  }`}>
                    {isFullyPaid ? '✅ Payment Complete (50% + Remaining)' : '💰 50% Advance Payment'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    isFullyPaid ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    Amount Paid: {formatCurrency(isFullyPaid ? totalAmount : paidAmount, order.currency)}
                  </p>
                  {!isFullyPaid && (
                    <>
                      <p className="text-sm text-orange-700">
                        Amount Due: {formatCurrency(dueAmount, order.currency)}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Remaining payment due before delivery
                      </p>
                    </>
                  )}
                  {isFullyPaid && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Both payments received
                    </p>
                  )}
                  {order.remainingPaymentId && (
                    <p className="text-xs text-gray-600 mt-1">
                      Remaining Payment ID: {order.remainingPaymentId}
                    </p>
                  )}
                </div>
              );
            })()}
            
            {/* ✅ Store Pickup Information */}
            {order.paymentmode === 'store_pickup' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 my-2">
                <p className="text-sm font-semibold text-blue-800">🏬 Pickup from Store</p>
                <p className="text-sm text-blue-700 mt-1">
                  Payment Due: {formatCurrency(
                    Number(order.totalPay || order.totalAmount || order.price || order.amount || 0), 
                    order.currency
                  )}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ Payment to be collected at pickup
                </p>
              </div>
            )}
            
            <p
              className={`font-medium ${
                order.razorpayPaymentId ? "text-green-600" : "text-yellow-600"
              }`}
            >
              Payment Status: {order.razorpayPaymentId ? "Paid" : "Unpaid"}
            </p>
            
            {/* ✅ Payment Mode Display */}
            <p className="text-sm text-gray-600">
              Payment Mode: <span className="font-medium text-gray-800">{(() => {
                if (order.paymentmode === '50%') {
                  const isFullyPaid = order.remainingPaymentId || (order.remainingAmount !== undefined && order.remainingAmount === 0);
                  return `50% Razorpay${isFullyPaid ? ' (Fully Paid)' : ''}`;
                }
                return order.paymentmode || 'N/A';
              })()}</span>
            </p>
            
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Expected Delivery:</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={
                    order.deliveryExpectedDate
                      ? new Date(order.deliveryExpectedDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDeliveryDateChange(new Date(e.target.value).toISOString());
                    }
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:border-blue-500 focus:outline-none focus:border-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {(() => {
                    const deliveryDate = order.deliveryExpectedDate;
                    return deliveryDate ? new Date(deliveryDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    }) : 'Select date';
                  })()}
                </span>
                {order.printroveEstimatedDelivery && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    Printrove
                  </span>
                )}
              </div>
              {order.printroveOrderId && (
                <p className="text-xs text-gray-500 mt-1">
                  Printrove Order: {order.printroveOrderId}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Order Items</h3>

        <div className="space-y-5">
          {(order.items || order.products)?.map((item, index) => {
            const qtySum = totalQty(item.quantity);
            const design =
              item.design ||
              item.design_data ||
              item.product?.design ||
              item?.customDesign ||
              {};

            const possibleViews = {
              front:
                design.frontView ||
                design.front ||
                design.front_image ||
                design.frontImg ||
                (design.front?.uploadedImage ?? null),
              back:
                design.backView ||
                design.back ||
                (design.back?.uploadedImage ?? null),
              left:
                design.leftView ||
                design.left ||
                (design.left?.uploadedImage ?? null),
              right:
                design.rightView ||
                design.right ||
                (design.right?.uploadedImage ?? null),
            };

            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* ✅ Image Display (Designer + Regular fallback) */}
                  <div className="w-20 h-20 bg-white rounded border border-gray-200 overflow-hidden flex items-center justify-center">
                    {(() => {
                      // 🔍 Step 1: find product if not attached
                      const product =
                        item.product ||
                        allProducts.find(
                          (p) =>
                            p._id === item.productId ||
                            p._id === item.product_id ||
                            p._id === item.id ||
                            p.slug === item.slug ||
                            p.products_name?.trim()?.toLowerCase() ===
                              item.name?.trim()?.toLowerCase()
                        );

                      // 🔍 Step 2: match color variant
                      const variants = product?.image_url || [];
                      const colorKey =
                        item.color?.toLowerCase?.() ||
                        item.colortext?.toLowerCase?.() ||
                        "";
                      const matched =
                        variants.find(
                          (v) =>
                            v.colorcode?.toLowerCase?.() === colorKey ||
                            v.colortext?.toLowerCase?.() === colorKey ||
                            v.colorname?.toLowerCase?.() === colorKey
                        ) || variants[0];

                      // 🔍 Step 3: choose image source
                      const imgSrc =
                        item.image ||
                        item.previewImages?.front ||
                        item.design?.frontView ||
                        matched?.designtshirt?.[0] ||
                        matched?.image_url?.[0] ||
                        matched?.img_url?.[0] ||
                        product?.images?.[0] ||
                        product?.image_url?.[0]?.image_url; // ✅ fallback for flat image_url array

                      console.log("🧩 Final Image Picked:", {
                        name: item.name,
                        productFound: !!product,
                        colorKey,
                        matched,
                        imgSrc,
                      });

                      return imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name || "T-Shirt"}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-gray-400">No image</div>
                      );
                    })()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {item.name ||
                        item.products_name ||
                        item.product?.products_name ||
                        "Unnamed Design"}
                    </p>

                    <div className="text-sm text-gray-600 mt-1">
                      Color:{" "}
                      <span className="font-medium">
                        {item.colortext || item.color || "-"}
                      </span>
                      &nbsp;|&nbsp; Qty:&nbsp;
                      <span className="font-medium">
                        {item.qty || qtySum}
                      </span>
                    </div>

                    <div className="mt-2">
                      <QuantityChips quantity={item.quantity} />
                    </div>

                    <p className="text-gray-800 font-semibold mt-2">
                      {formatCurrency(item.price || 0, order.currency)}
                    </p>
                  </div>
                </div>

                {/* ✅ Design Preview Section */}
                {Object.values(possibleViews).some(
                  (v) => typeof v === "string" && v.startsWith("data:image")
                ) && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      Design Preview
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Object.entries(possibleViews).map(([view, img]) =>
                        img && img.startsWith("data:image") ? (
                          <div
                            key={view}
                            className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center"
                          >
                            <div className="w-full aspect-square overflow-hidden flex items-center justify-center">
                              <img
                                src={img}
                                alt={`${view} preview`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[11px] text-gray-600 capitalize">
                                {view}
                              </span>
                              <a
                                href={img}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 hover:underline"
                              >
                                Open
                              </a>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* ✅ Uploaded Logo + Extra Files */}
                <div className="mt-3 space-y-2">
                  {(design.uploadedLogo || design.uploaded_logo) && (
                    <div className="text-xs">
                      <p className="font-medium text-gray-800">Uploaded Logo:</p>
                      <a
                        href={design.uploadedLogo || design.uploaded_logo}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Logo
                      </a>
                    </div>
                  )}

                  {Array.isArray(design.extraFiles) &&
                    design.extraFiles.length > 0 && (
                      <div className="text-xs">
                        <p className="font-medium text-gray-800">
                          Additional Files:
                        </p>
                        <ul className="list-disc pl-4">
                          {design.extraFiles.map((f, i) => (
                            <li key={i}>
                              <a
                                href={f.url || f}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {f.name || f.split("/").pop()}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Logistics Section for B2B Orders */}
      {order?.isCorporate && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">📦 Logistics & Shipping</h3>
          
          {logisticsLoading ? (
            <div className="text-center py-4 text-gray-500">Loading logistics data...</div>
          ) : logistics.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No logistics information available</div>
          ) : (
            <div className="space-y-6">
              {logistics.map((logistic, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {/* Logistics Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-semibold text-gray-900">{logistic.trackingNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier</p>
                      <p className="font-semibold text-gray-900">{logistic.carrier || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimated Delivery</p>
                      <p className="font-semibold text-gray-900">
                        {logistic.estimatedDelivery 
                          ? new Date(logistic.estimatedDelivery).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900">
                        {logistic.speedLogistics ? '⚡ Speed Logistics' : 'Standard'}
                      </p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {logistic.shippingAddress && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Shipping Address</p>
                      <p className="text-gray-900 text-sm">{logistic.shippingAddress}</p>
                    </div>
                  )}

                  {/* Logistics Images */}
                  {logistic.img && logistic.img.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-3">📸 Logistics Photos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {logistic.img.map((imgObj, imgIdx) => {
                          const imgUrl = typeof imgObj === 'string' ? imgObj : imgObj?.URL;
                          return imgUrl ? (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={imgUrl}
                                alt={`Logistics photo ${imgIdx + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-300 hover:border-blue-500 transition"
                              />
                              <a
                                href={imgUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition rounded-lg"
                                title="View full image"
                              >
                                <span className="text-white opacity-0 group-hover:opacity-100 transition">👁️</span>
                              </a>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  {logistic.note && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Note</p>
                      <p className="text-gray-900 text-sm">{logistic.note}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ Design Preview Modal */}
      {(() => {
        // ✅ Extract design images from order items
        let designImages = {};
        let additionalFiles = [];
        
        // ✅ FIRST: Try to extract from first product item (most reliable source)
        const firstItem = order.products?.[0];
        if (firstItem) {
          const design = firstItem.design || firstItem.design_data || firstItem.product?.design || firstItem?.customDesign || {};
          
          console.log('📸 MODAL EXTRACTION - Checking sources:', {
            'item.image': firstItem.image ? `${firstItem.image.substring(0, 50)}...` : 'NONE',
            'item.previewImages': firstItem.previewImages ? Object.keys(firstItem.previewImages) : 'NONE',
            'design.frontView': design.frontView ? 'EXISTS' : 'NONE',
            'item.additionalFilesMeta': firstItem.additionalFilesMeta?.length || 0,
            'design.additionalFilesMeta': design.additionalFilesMeta?.length || 0,
          });
          
          // ✅ Priority 1: item.image (this is what the thumbnail uses!)
          if (firstItem.image && typeof firstItem.image === 'string' && firstItem.image.startsWith('data:image')) {
            designImages = { front: firstItem.image };
            console.log('✅ MODAL: Using item.image');
          }
          // ✅ Priority 2: item.previewImages
          else if (firstItem.previewImages?.front || firstItem.previewImages?.back) {
            designImages = {
              front: firstItem.previewImages?.front || null,
              back: firstItem.previewImages?.back || null,
              left: firstItem.previewImages?.left || null,
              right: firstItem.previewImages?.right || null,
            };
            console.log('✅ MODAL: Using item.previewImages');
          }
          // ✅ Priority 3: design.frontView/backView
          else if (design.frontView && typeof design.frontView === 'string') {
            designImages = {
              front: design.frontView || null,
              back: design.backView || null,
              left: design.leftView || null,
              right: design.rightView || null,
            };
            console.log('✅ MODAL: Using design.*View');
          }
          // ✅ Priority 4: design.previewImages
          else if (design.previewImages?.front || design.previewImages?.back) {
            designImages = {
              front: design.previewImages?.front || null,
              back: design.previewImages?.back || null,
              left: design.previewImages?.left || null,
              right: design.previewImages?.right || null,
            };
            console.log('✅ MODAL: Using design.previewImages');
          }
          // ✅ Priority 5: design.front/back objects
          else if (design.front || design.back) {
            designImages = {
              front: typeof design.front === 'string' ? design.front : design.front?.uploadedImage || null,
              back: typeof design.back === 'string' ? design.back : design.back?.uploadedImage || null,
              left: typeof design.left === 'string' ? design.left : design.left?.uploadedImage || null,
              right: typeof design.right === 'string' ? design.right : design.right?.uploadedImage || null,
            };
            console.log('✅ MODAL: Using design.front/back objects');
          }
          
          // ✅ Extract additional files (CDR/PDF) from product item
          if (Array.isArray(firstItem.additionalFilesMeta) && firstItem.additionalFilesMeta.length > 0) {
            additionalFiles = firstItem.additionalFilesMeta;
            console.log('✅ MODAL: Found files in item.additionalFilesMeta:', additionalFiles.length);
          } else if (Array.isArray(design.additionalFilesMeta) && design.additionalFilesMeta.length > 0) {
            additionalFiles = design.additionalFilesMeta;
            console.log('✅ MODAL: Found files in design.additionalFilesMeta:', additionalFiles.length);
          } else if (Array.isArray(design.extraFiles) && design.extraFiles.length > 0) {
            additionalFiles = design.extraFiles;
            console.log('✅ MODAL: Found files in design.extraFiles:', additionalFiles.length);
          }
        }
        
        // ✅ FALLBACK: Check order.designImages if item extraction failed
        if (!designImages.front && !designImages.back) {
          const orderDesign = order.designImages || {};
          if (orderDesign.front || orderDesign.back || orderDesign.left || orderDesign.right) {
            designImages = orderDesign;
            console.log('✅ MODAL: Using order.designImages');
          }
        }
        
        // ✅ FALLBACK: Check order.additionalFilesMeta if item extraction failed
        if (additionalFiles.length === 0 && Array.isArray(order.additionalFilesMeta) && order.additionalFilesMeta.length > 0) {
          additionalFiles = order.additionalFilesMeta;
          console.log('✅ MODAL: Using order.additionalFilesMeta:', additionalFiles.length);
        }
        
        console.log('📸 MODAL FINAL:', {
          hasFront: !!designImages.front,
          hasBack: !!designImages.back,
          frontPreview: designImages.front ? `${designImages.front.substring(0, 30)}...` : 'NONE',
          filesCount: additionalFiles.length,
          files: additionalFiles.map(f => f.name || f),
        });
        
        return (
          <DesignPreviewModal
            isOpen={showDesignModal}
            onClose={() => setShowDesignModal(false)}
            designImages={designImages}
            additionalFiles={additionalFiles}
            orderId={order._id}
          />
        );
      })()}
    </div>
  );
};

export default OrderDetailsCard;
