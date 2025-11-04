import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLogisticsByOrder } from "../Service/logisticsApi";
import { getOrderTracking, syncOrderStatus } from "../Service/trackingApi";
import { getWallet } from "../Service/APIservice";
import { FaWallet, FaSync, FaExternalLinkAlt, FaShippingFast, FaBox, FaCheckCircle, FaClock } from "react-icons/fa";

const ACCENT = "#E5C870";
const BG = "#0A0A0A";

const Badge = ({ children }) => (
  <span
    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] md:text-xs font-semibold"
    style={{
      backgroundColor: "rgba(229,200,112,0.15)",
      color: ACCENT,
      border: `1px solid ${ACCENT}33`,
    }}
  >
    {children}
  </span>
);

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || "");
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="rounded-lg border px-3 py-2 text-xs md:text-sm active:scale-[0.98]"
      style={{ borderColor: ACCENT, color: ACCENT }}
      title="Copy"
      aria-live="polite"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");
const fmtDateOnly = (d) => (d ? new Date(d).toLocaleDateString() : "-");

export default function TrackOrder() {
  // Accept /track/:orderId OR /track/:id
  const { orderId: p1, id: p2 } = useParams();
  const orderId = p1 || p2 || "";

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  
  // Enhanced tracking data
  const [trackingData, setTrackingData] = useState(null);
  const [timeline, setTimeline] = useState([]);

  // Wallet state (JS-friendly)
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const orderSummary = useMemo(() => {
    if (trackingData?.order) {
      return {
        id: trackingData.order._id,
        status: trackingData.order.status,
        total: trackingData.order.totalPay || trackingData.order.price,
        printroveOrderId: trackingData.order.printroveOrderId,
        printroveStatus: trackingData.order.printroveStatus,
        trackingUrl: trackingData.order.printroveTrackingUrl
      };
    }
    
    // Fallback to logistics data
    const first = rows?.[0];
    const o = first?.orderId;
    if (!o) return null;
    return typeof o === "object"
      ? { id: o._id, status: o.status, total: o.total }
      : { id: o };
  }, [trackingData, rows]);

  const fetchData = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setErr("");
      
      // Fetch enhanced tracking data
      const trackingRes = await getOrderTracking(orderId);
      setTrackingData(trackingRes);
      setTimeline(trackingRes.timeline || []);
      
      // Also fetch logistics data for backward compatibility
      const logisticsRes = await getLogisticsByOrder(orderId, { populate: true });
      setRows(Array.isArray(logisticsRes) ? logisticsRes : logisticsRes?.logistics ?? []);
      
    } catch (e) {
      setErr(e?.message || "Failed to fetch tracking information");
      setRows([]);
      setTrackingData(null);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!orderId || syncing) return;
    try {
      setSyncing(true);
      await syncOrderStatus(orderId);
      // Refresh data after sync
      await fetchData();
    } catch (e) {
      console.error("Sync failed:", e);
      setErr(e?.message || "Failed to sync order status");
    } finally {
      setSyncing(false);
    }
  };

  // Fetch wallet balance (best-effort)
  const fetchWallet = async () => {
    try {
      setWalletLoading(true);
      const raw = localStorage.getItem("userId") || localStorage.getItem("user");
      let uid = undefined; // <-- FIXED: declare it

      if (raw) {
        try {
          // If it's a JSON user object
          const parsed = JSON.parse(raw);
          uid = parsed?.id || parsed?._id || parsed?.userId;
        } catch {
          // If it's just the id string
          uid = raw;
        }
      }

      if (!uid) {
        setWalletBalance(null);
        return;
      }

      const w = await getWallet(uid);
      const balance = Number(
        (w && (w.balance ?? w?.data?.balance ?? w?.wallet?.balance)) ?? 0
      );
      setWalletBalance(Number.isFinite(balance) ? balance : 0);
    } catch {
      setWalletBalance(null);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 md:px-6 py-4 md:py-8 text-white">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold leading-tight">Order Tracking</h1>
            <p className="mt-1 text-xs md:text-sm text-gray-300 truncate">
              Order ID:&nbsp;
              <span className="font-mono">{orderSummary?.id || orderId || "-"}</span>
            </p>
            {orderSummary?.printroveOrderId && (
              <p className="mt-1 text-xs md:text-sm text-gray-300 truncate">
                Printrove ID:&nbsp;
                <span className="font-mono">{orderSummary.printroveOrderId}</span>
              </p>
            )}
            {orderSummary?.status && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>Status: {orderSummary.status}</Badge>
                {orderSummary.printroveStatus && orderSummary.printroveStatus !== orderSummary.status && (
                  <Badge>Duco Art: {orderSummary.printroveStatus}</Badge>
                )}
                {typeof orderSummary.total !== "undefined" && (
                  <span className="text-xs md:text-sm text-gray-300">
                    Total: ₹{Number(orderSummary.total).toLocaleString()}
                  </span>
                )}
                {walletBalance !== null && (
                  <Badge>Wallet: ₹{walletBalance.toLocaleString()}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/wallet")}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
              title="Open Wallet"
            >
              <FaWallet className="text-lg md:text-xl" />
              <span className="text-sm md:text-base">
                {walletLoading
                  ? "Loading..."
                  : walletBalance === null
                  ? "Wallet"
                  : `₹${walletBalance.toLocaleString()}`}
              </span>
            </button>

            {orderSummary?.trackingUrl && (
              <button
                onClick={() => window.open(orderSummary.trackingUrl, '_blank')}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
                title="Track on Printrove"
              >
                <FaExternalLinkAlt className="text-sm" />
                <span className="text-sm md:text-base">Track Shipment</span>
              </button>
            )}

            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
              style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
              title="Sync with Printrove"
            >
              <FaSync className={`text-sm ${syncing ? 'animate-spin' : ''}`} />
              <span className="text-sm md:text-base">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              onClick={fetchData}
              className="rounded-xl px-4 py-2 font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: ACCENT,
                color: "#0A0A0A",
                boxShadow: "0 0 0 1px rgba(229,200,112,0.25) inset",
              }}
            >
              Refresh
            </button>

            <button
              onClick={() => navigate(`/invoice/${orderId}`)}
              className="rounded-xl px-4 py-2 font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
            >
              Download Invoice
            </button>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div
            className="rounded-2xl p-4 md:p-6 space-y-2"
            style={{ backgroundColor: "#111", border: `1px solid ${ACCENT}33` }}
          >
            <div className="h-4 w-40 animate-pulse rounded bg-gray-700" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-800" />
          </div>
        )}

        {!loading && err && (
          <div
            className="rounded-2xl border p-3 md:p-4 text-sm"
            style={{ borderColor: "#ff4d4f66", backgroundColor: "#2a1414" }}
          >
            {err}
          </div>
        )}

        {/* Quick Stats */}
        {!loading && !err && trackingData?.order && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Products</div>
              <div className="text-xl font-bold text-white mt-1">
                {trackingData.order.products?.length || 0}
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Items</div>
              <div className="text-xl font-bold text-white mt-1">
                {trackingData.order.products?.reduce((total, product) => {
                  return total + Object.values(product.quantity || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
                }, 0) || 0}
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Order Value</div>
              <div className="text-xl font-bold text-white mt-1">
                ₹{(trackingData.order.totalPay || trackingData.order.price || 0).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Expected Delivery</div>
              <div className="text-lg font-bold text-white mt-1">
                {trackingData.order.printroveEstimatedDelivery 
                  ? new Date(trackingData.order.printroveEstimatedDelivery).toLocaleDateString()
                  : trackingData.order.deliveryExpectedDate 
                    ? new Date(trackingData.order.deliveryExpectedDate).toLocaleDateString()
                    : 'TBD'
                }
              </div>
              {trackingData.order.printroveEstimatedDelivery && (
                <div className="text-xs text-blue-400 mt-1">Duco Art Estimate</div>
              )}
            </div>
          </div>
        )}

        {/* Order Details Section */}
        {!loading && !err && trackingData?.order && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: ACCENT }}>Order Details</h2>
            <div className="rounded-2xl p-4 md:p-6" style={{ backgroundColor: "#111", border: `1px solid ${ACCENT}33` }}>
              
              {/* Customer Information */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Name" value={trackingData.order.address?.fullName || trackingData.order.address?.name || 'N/A'} />
                  <InfoRow label="Email" value={trackingData.order.address?.email || 'N/A'} />
                  <InfoRow label="Phone" value={trackingData.order.address?.mobileNumber || trackingData.order.address?.phone || 'N/A'} />
                  <InfoRow label="Order Date" value={fmtDate(trackingData.order.createdAt)} />
                </div>
              </div>

              {/* Delivery Information */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-3">Delivery Information</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Expected Delivery Date */}
                    <div>
                      <Label>Expected Delivery Date</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-lg font-semibold text-white">
                          {trackingData.order.printroveEstimatedDelivery 
                            ? new Date(trackingData.order.printroveEstimatedDelivery).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : trackingData.order.deliveryExpectedDate 
                              ? new Date(trackingData.order.deliveryExpectedDate).toLocaleDateString('en-IN', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'To be determined'
                          }
                        </span>
                        {trackingData.order.printroveEstimatedDelivery && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                            Printrove
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {trackingData.order.printroveEstimatedDelivery 
                          ? 'Based on Duco Art production and shipping schedule'
                          : 'Based on standard processing time'
                        }
                      </div>
                    </div>

                    {/* Current Status */}
                    <div>
                      <Label>Current Status</Label>
                      <div className="mt-1">
                        <span className="text-lg font-semibold text-white">{trackingData.order.status}</span>
                        {trackingData.order.printroveStatus && trackingData.order.printroveStatus !== trackingData.order.status && (
                          <div className="text-sm text-gray-300 mt-1">
                            Duco Art: {trackingData.order.printroveStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-3">Shipping Address</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {trackingData.order.address?.fullName || trackingData.order.address?.name}<br />
                    {trackingData.order.address?.houseNumber} {trackingData.order.address?.street}<br />
                    {trackingData.order.address?.landmark && `${trackingData.order.address.landmark}, `}
                    {trackingData.order.address?.city}, {trackingData.order.address?.state}<br />
                    {trackingData.order.address?.country} - {trackingData.order.address?.pincode}
                  </p>
                </div>
              </div>

              {/* Products */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-3">Products Ordered</h3>
                <div className="space-y-4">
                  {trackingData.order.products?.map((product, index) => (
                    <ProductCard key={index} product={product} />
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-base font-semibold text-white mb-3">Order Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Subtotal" value={`₹${(trackingData.order.price || 0).toLocaleString()}`} />
                  <InfoRow label="Total Amount" value={`₹${(trackingData.order.totalPay || trackingData.order.price || 0).toLocaleString()}`} />
                  <InfoRow label="Payment Status" value={trackingData.order.paymentStatus || 'N/A'} />
                  <InfoRow label="Payment Method" value={trackingData.order.paymentmode || 'N/A'} />
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !err && timeline.length === 0 && rows.length === 0 && (
          <div
            className="rounded-2xl border p-6 text-center text-sm"
            style={{ borderColor: `${ACCENT}33`, backgroundColor: "#101010" }}
          >
            No tracking information found for this order yet.
          </div>
        )}

        {/* Printrove Information */}
        {!loading && !err && trackingData?.order?.printroveOrderId && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: ACCENT }}>Production & Shipping</h2>
            <div className="rounded-2xl p-4 md:p-6" style={{ backgroundColor: "#111", border: `1px solid ${ACCENT}33` }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Printrove Order ID" value={trackingData.order.printroveOrderId} />
                <InfoRow label="Production Status" value={trackingData.order.printroveStatus || 'Processing'} />
                
                {/* Enhanced External Tracking */}
                {trackingData.order.printroveTrackingUrl && (
                  <div className="md:col-span-2">
                    <Label>Courier Tracking</Label>
                    <div className="mt-2 p-4 bg-gray-800 rounded-lg">
                      {trackingData.printroveData?.order?.courier && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-300">Courier Partner:</span>
                            <span className="text-white font-semibold">{trackingData.printroveData.order.courier.name}</span>
                          </div>
                          {trackingData.printroveData.order.tracking_status && (
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-300">Current Status:</span>
                              <span className="text-white">{trackingData.printroveData.order.tracking_status}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => window.open(trackingData.order.printroveTrackingUrl, '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors w-full justify-center"
                      >
                        <FaExternalLinkAlt />
                        Track with {trackingData.printroveData?.order?.courier?.name || 'Courier'}
                      </button>
                    </div>
                  </div>
                )}

                {trackingData.order.printroveItems && trackingData.order.printroveItems.length > 0 && (
                  <div className="md:col-span-2">
                    <Label>Production Items</Label>
                    <div className="mt-2 space-y-2">
                      {trackingData.order.printroveItems.map((item, index) => (
                        <div key={index} className="bg-gray-800 rounded p-3 text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {item.product_name && <div><span className="text-gray-400">Product:</span> {item.product_name}</div>}
                            {item.variant_id && <div><span className="text-gray-400">Variant:</span> {item.variant_id}</div>}
                            {item.quantity && <div><span className="text-gray-400">Quantity:</span> {item.quantity}</div>}
                            {item.status && <div><span className="text-gray-400">Status:</span> {item.status}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Timeline */}
        {!loading && !err && timeline.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: ACCENT }}>Order Timeline</h2>
            <div className="relative">
              {/* vertical line */}
              <div
                className="absolute left-3 md:left-4 top-0 h-full w-px"
                style={{ background: `linear-gradient(${ACCENT}, transparent)` }}
              />
              <ul className="space-y-4">
                {timeline.map((event, index) => {
                  const isCompleted = event.isCompleted;
                  const isCurrent = !isCompleted && index === timeline.findIndex(e => !e.isCompleted);
                  const isDeliveryEstimate = event.type === 'estimate';
                  
                  return (
                    <li
                      key={index}
                      className="relative ml-8 md:ml-10 rounded-2xl p-4"
                      style={{ 
                        backgroundColor: isCompleted ? "#0a1a0a" : isCurrent ? "#1a1a0a" : isDeliveryEstimate ? "#0a0a1a" : "#101010", 
                        border: `1px solid ${isCompleted ? "#22aa22" : isCurrent ? ACCENT : isDeliveryEstimate ? "#4444ff" : `${ACCENT}22`}` 
                      }}
                    >
                      {/* node dot */}
                      <span
                        className="absolute -left-5 md:-left-6 top-5 block h-3 w-3 rounded-full ring-4"
                        style={{
                          backgroundColor: isCompleted ? "#22aa22" : isCurrent ? ACCENT : isDeliveryEstimate ? "#4444ff" : "#666",
                          boxShadow: `0 0 0 2px ${isCompleted ? "rgba(34,170,34,0.3)" : isCurrent ? "rgba(229,200,112,0.3)" : isDeliveryEstimate ? "rgba(68,68,255,0.3)" : "rgba(102,102,102,0.3)"}`,
                        }}
                      />

                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <TimelineIcon type={event.type} isCompleted={isCompleted} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-semibold text-white">{event.status}</h3>
                              {event.isPrintroveEstimate && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                                  Printrove
                                </span>
                              )}
                              {event.type === 'tracking' && (
                                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                                  Live Tracking
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-300">{event.description}</p>
                            
                            {/* Special tracking button for tracking events */}
                            {event.trackingUrl && (
                              <div className="mt-2">
                                <button
                                  onClick={() => window.open(event.trackingUrl, '_blank')}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                                >
                                  <FaExternalLinkAlt className="text-xs" />
                                  Track with {event.courierName || 'Courier'}
                                  {event.trackingStatus && (
                                    <span className="ml-1 px-1 py-0.5 bg-green-800 rounded text-xs">
                                      {event.trackingStatus}
                                    </span>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge>{fmtDate(event.timestamp)}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Timeline */}
        {!loading && !err && rows.length > 0 && (
          <div className="relative mt-3 md:mt-4">
            {/* vertical line */}
            <div
              className="absolute left-3 md:left-4 top-0 h-full w-px"
              style={{ background: `linear-gradient(${ACCENT}, transparent)` }}
            />
            <ul className="space-y-3 md:space-y-4">
              {rows.map((l) => {
                const imgs = Array.isArray(l.img) ? l.img : [];
                const awb = l.trackingNumber || "";
                return (
                  <li
                    key={l._id}
                    className="relative ml-8 md:ml-10 rounded-2xl p-3 md:p-4"
                    style={{ backgroundColor: "#101010", border: `1px solid ${ACCENT}22` }}
                  >
                    {/* node dot */}
                    <span
                      className="absolute -left-5 md:-left-6 top-4 md:top-5 block h-2.5 w-2.5 md:h-3 md:w-3 rounded-full ring-4"
                      style={{
                        backgroundColor: ACCENT,
                        boxShadow: "0 0 0 2px rgba(229,200,112,0.3)",
                      }}
                    />

                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm md:text-base font-semibold">Logistic Update</h3>
                        <Badge>{fmtDate(l.createdAt)}</Badge>
                      </div>
                      {awb && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs md:text-sm text-gray-300">
                            Tracking:&nbsp;
                            <span className="font-mono text-white break-all">{awb}</span>
                          </span>
                          <CopyBtn text={awb} />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoRow label="Carrier" value={l.carrier || "-"} />
                      <InfoRow label="Estimated Delivery" value={fmtDateOnly(l.estimatedDelivery)} />
                      <InfoRow label="Updated At" value={fmtDate(l.updatedAt)} />
                      <InfoRow label="Logistic Id" value={<span className="font-mono">{l._id}</span>} />
                    </div>

                    <div className="mt-3">
                      <Label>Shipping Address</Label>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                        {l.shippingAddress || "-"}
                      </p>
                    </div>

                    {l.note && (
                      <div className="mt-3">
                        <Label>Note</Label>
                        <p className="mt-1 text-sm text-gray-200">{l.note}</p>
                      </div>
                    )}

                    {imgs.length > 0 && (
                      <div className="mt-4">
                        <Label>Images</Label>
                        <div className="mt-2 flex gap-2 overflow-x-auto md:overflow-visible md:flex-wrap md:gap-2 pb-1">
                          {imgs.map((im, idx) => {
                            const src = typeof im === "string" ? im : im?.URL;
                            if (!src) return null;
                            return (
                              <a
                                key={idx}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                title={src}
                                className="block shrink-0"
                              >
                                <img
                                  src={src}
                                  alt=""
                                  className="h-16 w-16 md:h-16 md:w-16 rounded-lg object-cover ring-1"
                                  style={{ ringColor: `${ACCENT}44` }}
                                  onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Mobile sticky actions */}
        <div className="md:hidden h-16" />
        <MobileActionBar
          onRefresh={fetchData}
          onSync={handleSync}
          onInvoice={() => navigate(`/invoice/${orderId}`)}
          onWallet={() => navigate(`/wallet`)}
          onTrack={orderSummary?.trackingUrl ? () => window.open(orderSummary.trackingUrl, '_blank') : null}
          walletLoading={walletLoading}
          walletBalance={walletBalance}
          syncing={syncing}
        />
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 text-sm text-gray-200 break-words">{value || "-"}</div>
    </div>
  );
}

function ProductCard({ product }) {
  const getFirstImageByColor = (product) => {
    if (!product?.image_url || !product.color) return null;
    const match = product.image_url.find(
      (img) => img.colorcode?.toLowerCase() === product.color?.toLowerCase()
    );
    return match?.url?.[0] || product.image_url?.[0]?.url?.[0] || null;
  };

  const productImage = getFirstImageByColor(product) || 
                      product.previewImages?.front || 
                      product.image_url?.[0]?.url?.[0] || 
                      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMDAgNzBDOTQuNDc3MiA3MCA5MCA3NC40NzcyIDkwIDgwVjEyMEM5MCA5NC40NzcyIDk0LjQ3NzIgOTAgMTAwIDkwSDEwMEMxMDUuNTIzIDkwIDExMCA5NC40NzcyIDExMCAxMjBWODBDMTEwIDc0LjQ3NzIgMTA1LjUyMyA3MCAxMDAgNzBaIiBmaWxsPSIjNkI3Mjg0Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row gap-4">
      {/* Product Image */}
      <div className="w-full sm:w-24 h-24 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={productImage}
          alt={product.products_name || product.name || 'Product'}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMDAgNzBDOTQuNDc3MiA3MCA5MCA3NC40NzcyIDkwIDgwVjEyMEM5MCA5NC40NzcyIDk0LjQ3NzIgOTAgMTAwIDkwSDEwMEMxMDUuNTIzIDkwIDExMCA5NC40NzcyIDExMCAxMjBWODBDMTEwIDc0LjQ3NzIgMTA1LjUyMyA3MCAxMDAgNzBaIiBmaWxsPSIjNkI3Mjg0Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
          }}
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 space-y-2">
        <h4 className="text-white font-semibold text-sm md:text-base">
          {product.products_name || product.name || 'Custom Product'}
        </h4>
        
        {/* Product Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
          {product.color && (
            <div>
              <span className="text-gray-400">Color: </span>
              <span className="text-white">{product.color}</span>
            </div>
          )}
          
          {product.gender && (
            <div>
              <span className="text-gray-400">Gender: </span>
              <span className="text-white">{product.gender}</span>
            </div>
          )}

          {product.price && (
            <div>
              <span className="text-gray-400">Price: </span>
              <span className="text-white">₹{product.price}</span>
            </div>
          )}

          {product.printroveOrderId && (
            <div>
              <span className="text-gray-400">Printrove ID: </span>
              <span className="text-white font-mono text-xs">{product.printroveOrderId}</span>
            </div>
          )}
        </div>

        {/* Quantities by Size */}
        {product.quantity && Object.keys(product.quantity).length > 0 && (
          <div>
            <span className="text-gray-400 text-xs md:text-sm">Quantities: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(product.quantity).map(([size, qty]) =>
                Number(qty) > 0 ? (
                  <span
                    key={size}
                    className="px-2 py-1 bg-gray-700 text-white text-xs rounded border"
                  >
                    {size}: {qty}
                  </span>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Design Information */}
        {product.design && (
          <div className="mt-3">
            <span className="text-gray-400 text-xs md:text-sm">Design: </span>
            <div className="mt-1 space-y-1">
              {/* Custom Text */}
              {product.design.customText && (
                <div className="text-xs">
                  <span className="text-yellow-400">Text: </span>
                  <span className="text-white">"{product.design.customText}"</span>
                </div>
              )}
              
              {/* Design Images */}
              {product.previewImages && (
                <div className="flex gap-2 mt-2">
                  {Object.entries(product.previewImages).map(([side, imageUrl]) => 
                    imageUrl ? (
                      <div key={side} className="text-center">
                        <img
                          src={imageUrl}
                          alt={`${side} design`}
                          className="w-12 h-12 object-contain bg-gray-700 rounded border"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className="text-xs text-gray-400 capitalize">{side}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Design Sides Info */}
              {(product.design.front || product.design.back || product.design.left || product.design.right) && (
                <div className="text-xs">
                  <span className="text-gray-400">Printed sides: </span>
                  <span className="text-white">
                    {[
                      product.design.front && 'Front',
                      product.design.back && 'Back', 
                      product.design.left && 'Left',
                      product.design.right && 'Right'
                    ].filter(Boolean).join(', ') || 'None'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Printrove Variant Information */}
        {product.printroveVariantsBySize && Object.keys(product.printroveVariantsBySize).length > 0 && (
          <div className="mt-2">
            <span className="text-gray-400 text-xs">Printrove Variants: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(product.printroveVariantsBySize).map(([size, variantId]) => (
                <span
                  key={size}
                  className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded font-mono"
                  title={`Size ${size}: Variant ID ${variantId}`}
                >
                  {size}: {variantId}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineIcon({ type, isCompleted }) {
  const iconProps = {
    className: `text-lg ${isCompleted ? 'text-green-400' : 'text-gray-400'}`,
  };

  switch (type) {
    case 'order':
      return <FaCheckCircle {...iconProps} />;
    case 'production':
      return <FaBox {...iconProps} />;
    case 'status':
      return <FaShippingFast {...iconProps} />;
    case 'estimate':
      return <FaClock {...iconProps} />;
    case 'tracking':
      return <FaExternalLinkAlt {...iconProps} />;
    default:
      return <FaCheckCircle {...iconProps} />;
  }
}

function MobileActionBar({ onRefresh, onSync, onInvoice, onWallet, onTrack, walletLoading, walletBalance, syncing }) {
  const hasTrack = !!onTrack;
  const gridCols = hasTrack ? "grid-cols-4" : "grid-cols-3";
  
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur supports-[backdrop-filter]:bg-black/50 bg-black/70"
      style={{ borderColor: `${ACCENT}22` }}
    >
      <div className={`mx-auto max-w-4xl px-3 py-3 grid ${gridCols} gap-2`}>
        <button
          onClick={onRefresh}
          className="w-full rounded-xl px-2 py-3 text-xs font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2"
          style={{
            backgroundColor: ACCENT,
            color: "#0A0A0A",
            boxShadow: "0 0 0 1px rgba(229,200,112,0.25) inset",
          }}
        >
          Refresh
        </button>
        
        <button
          onClick={onSync}
          disabled={syncing}
          className="w-full rounded-xl px-2 py-3 text-xs font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 disabled:opacity-50 inline-flex items-center justify-center gap-1"
          style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
        >
          <FaSync className={`text-xs ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Sync...' : 'Sync'}</span>
        </button>
        
        {hasTrack && (
          <button
            onClick={onTrack}
            className="w-full rounded-xl px-2 py-3 text-xs font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 inline-flex items-center justify-center gap-1"
            style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
          >
            <FaExternalLinkAlt className="text-xs" />
            <span>Track</span>
          </button>
        )}
        
        <button
          onClick={onInvoice}
          className="w-full rounded-xl px-2 py-3 text-xs font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2"
          style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
        >
          Invoice
        </button>
        
        {!hasTrack && (
          <button
            onClick={onWallet}
            className="w-full rounded-xl px-2 py-3 text-xs font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 inline-flex items-center justify-center gap-1"
            style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
          >
            <FaWallet className="text-xs" />
            <span className="truncate">
              {walletLoading
                ? "Wallet…"
                : walletBalance === null
                ? "Wallet"
                : `₹${walletBalance.toLocaleString()}`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
