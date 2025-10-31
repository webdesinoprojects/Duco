import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLogisticsByOrder } from "../Service/logisticsApi";
import { getWallet } from "../Service/APIservice";
import { FaWallet } from "react-icons/fa";

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
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // Wallet state (JS-friendly)
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const orderSummary = useMemo(() => {
    const first = rows?.[0];
    const o = first?.orderId;
    if (!o) return null;
    return typeof o === "object"
      ? { id: o._id, status: o.status, total: o.total }
      : { id: o };
  }, [rows]);

  const fetchData = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setErr("");
      const res = await getLogisticsByOrder(orderId, { populate: true });
      // controller returns array sorted by createdAt desc
      setRows(Array.isArray(res) ? res : res?.logistics ?? []);
    } catch (e) {
      setErr(e?.message || "Failed to fetch logistics");
      setRows([]);
    } finally {
      setLoading(false);
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
            {orderSummary?.status && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>Status: {orderSummary.status}</Badge>
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

        {!loading && !err && rows.length === 0 && (
          <div
            className="rounded-2xl border p-6 text-center text-sm"
            style={{ borderColor: `${ACCENT}33`, backgroundColor: "#101010" }}
          >
            No logistics found for this order yet.
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
          onInvoice={() => navigate(`/invoice/${orderId}`)}
          onWallet={() => navigate(`/wallet`)}
          walletLoading={walletLoading}
          walletBalance={walletBalance}
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

function MobileActionBar({ onRefresh, onInvoice, onWallet, walletLoading, walletBalance }) {
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur supports-[backdrop-filter]:bg-black/50 bg-black/70"
      style={{ borderColor: `${ACCENT}22` }}
    >
      <div className="mx-auto max-w-4xl px-3 py-3 grid grid-cols-3 gap-2">
        <button
          onClick={onRefresh}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2"
          style={{
            backgroundColor: ACCENT,
            color: "#0A0A0A",
            boxShadow: "0 0 0 1px rgba(229,200,112,0.25) inset",
          }}
        >
          Refresh
        </button>
        <button
          onClick={onInvoice}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2"
          style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
        >
          Invoice
        </button>
        <button
          onClick={onWallet}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}
        >
          <FaWallet className="text-base" />
          <span className="truncate">
            {walletLoading
              ? "Wallet…"
              : walletBalance === null
              ? "Wallet"
              : `₹${walletBalance.toLocaleString()}`}
          </span>
        </button>
      </div>
    </div>
  );
}
