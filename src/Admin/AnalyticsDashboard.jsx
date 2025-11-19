// React + Tailwind CSS + Recharts frontend (no shadcn/ui, no extra UI libs)
// - No pagination; shows all orders in range
// - Filters: from, to, groupBy (day/month/none), status (multi), includeCancelled
// - Summary cards, optional breakdown chart, orders table
// - Assumes the backend is available at the same origin: /api/analytics/sales
//   If you use a different origin, set API_BASE accordingly.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const API_BASE = 'https://duco-67o5.onrender.com/'; // e.g. "http://localhost:5000"; keep empty for same-origin

const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function formatINR(num) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(num || 0));
  } catch {
    return `₹${Number(num || 0).toFixed(0)}`;
  }
}

function toInputDate(d) {
  // Date -> yyyy-mm-dd
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDefaultRange(daysBack = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (daysBack - 1));
  return { from: toInputDate(start), to: toInputDate(end) };
}

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function buildParams({ from, to, groupBy, includeCancelled, statusFilter }) {
  const params = new URLSearchParams();
  params.set('from', from);
  params.set('to', to);
  if (groupBy && groupBy !== 'none') params.set('groupBy', groupBy);
  if (includeCancelled) params.set('includeCancelled', 'true');
  if (statusFilter?.length) params.set('status', statusFilter.join(','));
  return params.toString();
}

async function tryFetch(url, controller) {
  const res = await fetch(url, { signal: controller?.signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `Request failed (${res.status}) @ ${url}`);
  }
  return res.json();
}

function summarizeClientSide(orders = []) {
  const paid = orders.filter((o) => o?.razorpayPaymentId);
  const totalAmount = paid.reduce((sum, o) => sum + Number(o?.price || 0), 0);
  const totalOrders = paid.length;
  const avgOrderValue = totalOrders ? Math.round(totalAmount / totalOrders) : 0;
  return { totalAmount, totalOrders, avgOrderValue };
}

export default function AnalyticsDashboard() {
  const { from: _from, to: _to } = getDefaultRange(7);
  const [from, setFrom] = useState(_from);
  const [to, setTo] = useState(_to);
  const [groupBy, setGroupBy] = useState('day'); // "day" | "month" | "none"
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState(['Delivered', 'Shipped']); // sensible default

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    summary: null,
    breakdown: [],
    orders: [],
  });

  // === Query management ===
  const canQuery = useMemo(() => Boolean(from && to), [from, to]);
  const queryString = useMemo(
    () => buildParams({ from, to, groupBy, includeCancelled, statusFilter }),
    [from, to, groupBy, includeCancelled, statusFilter]
  );
  const debouncedQueryString = useDebounce(queryString, 550);

  const abortRef = useRef(null);

  async function fetchAnalytics(useDebounced = false) {
    if (!canQuery) return;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    // We’ll try these endpoints in order for maximum compatibility with your backend:
    const qs = useDebounced ? debouncedQueryString : queryString;
    const candidates = [
      `/api/sales?${qs}`,
      `/api/analytics/sales?${qs}`,
      `${API_BASE}api/sales?${qs}`,
      `${API_BASE}api/analytics/sales?${qs}`,
    ];

    try {
      let json = null;
      let lastError = null;

      for (const url of candidates) {
        try {
          json = await tryFetch(url, controller);
          if (json) break;
        } catch (e) {
          lastError = e;
          // continue trying next endpoint
        }
      }
      if (!json) throw lastError || new Error('No response from any endpoint.');

      // Normalize payload
      const summary = json.summary || null;
      const breakdown = Array.isArray(json.breakdown) ? json.breakdown : [];
      const orders = Array.isArray(json.orders)
        ? json.orders
        : Array.isArray(json.orders?.items)
        ? json.orders.items
        : [];

      setData({
        summary: summary || summarizeClientSide(orders),
        breakdown,
        orders,
      });
    } catch (e) {
      if (e?.name === 'AbortError') return; // ignore
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  // Auto-load on first mount
  useEffect(() => {
    fetchAnalytics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh on filter changes (debounced)
  useEffect(() => {
    if (!canQuery) return;
    fetchAnalytics(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQueryString, canQuery]);

  function toggleStatus(s) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function exportCSV() {
    const rows = [
      [
        'OrderID',
        'Date(IST)',
        'UserId',
        'Price',
        'Status',
        'RazorpayPaymentId',
      ],
      ...data.orders.map((o) => [
        o?._id || '',
        o?.createdAt
          ? new Date(o.createdAt).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })
          : '',
        typeof o?.user === 'object' && o?.user?._id
          ? o.user._id
          : String(o?.user || ''),
        Number(o?.price || 0),
        o?.status || '',
        o?.razorpayPaymentId || '',
      ]),
    ];

    const csv =
      rows
        .map((r) =>
          r.map((x) => `"${String(x).replaceAll(`"`, `""`)}"`).join(',')
        )
        .join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // X-axis label formatter for dates like "2025-09-29" or ISO strings
  const xTickFormatter = (val) => {
    if (!val) return '';
    // If looks like YYYY-MM or YYYY-MM-DD
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(val)) return val;
    // Try to parse ISO
    const d = new Date(val);
    if (!isNaN(d)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return String(val);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Sales Analytics</h1>
            <p className="text-sm text-gray-300">
              Paid orders only (razorpayPaymentId ≠ null)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics(false)}
              disabled={!canQuery || loading}
              className="inline-flex items-center gap-2 bg-[#E5C870] text-black px-4 py-2 rounded-md disabled:opacity-60"
            >
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <span className="inline-block w-4 h-4">⟳</span>
              )}
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 border border-[#E5C870] text-[#E5C870] px-4 py-2 rounded-md"
            >
              <span className="inline-block w-4 h-4">⇩</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#111] border border-[#222] rounded-2xl">
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#333] text-white rounded-md px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#333] text-white rounded-md px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#333] text-white rounded-md px-3 py-2"
                >
                  <option value="none">None</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Include Cancelled
                </label>
                <div className="flex items-center gap-2 p-2 rounded-lg border border-[#333] bg-[#0B0B0B]">
                  <input
                    id="inc-cancelled"
                    type="checkbox"
                    checked={includeCancelled}
                    onChange={(e) => setIncludeCancelled(e.target.checked)}
                    className="accent-[#E5C870]"
                  />
                  <label htmlFor="inc-cancelled" className="text-sm">
                    Include
                  </label>
                </div>
              </div>
            </div>

            {/* Status multi-select */}
            <div className="mt-4">
              <p className="text-sm text-gray-300 mb-2">Status Filter</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-3 py-1 rounded-full border ${
                      statusFilter.includes(s)
                        ? 'bg-[#E5C870] text-black border-[#E5C870]'
                        : 'bg-transparent text-gray-300 border-[#333]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl">
            <div className="p-4">
              <p className="text-sm text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold">
                {data.summary?.totalOrders ?? 0}
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-2xl">
            <div className="p-4">
              <p className="text-sm text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold">
                {formatINR(data.summary?.totalAmount || 0)}
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-2xl">
            <div className="p-4">
              <p className="text-sm text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold">
                {formatINR(data.summary?.avgOrderValue || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown Chart */}
        <div className="bg-[#111] border border-[#222] rounded-2xl">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-5 h-5">📊</span>
              <h3 className="font-semibold">
                Breakdown{' '}
                {groupBy !== 'none' ? `(by ${groupBy})` : '(disabled)'}
              </h3>
            </div>
            {groupBy === 'none' || !data.breakdown?.length ? (
              <div className="text-sm text-gray-400">
                {groupBy === 'none'
                  ? 'Select a group to view chart.'
                  : 'No breakdown data for selected filters.'}
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.breakdown}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fill: '#d1d5db' }}
                      tickFormatter={xTickFormatter}
                    />
                    <YAxis tick={{ fill: '#d1d5db' }} />
                    <Tooltip
                      formatter={(v, n) =>
                        n === 'totalAmount' ? [formatINR(v), 'Amount'] : [v, n]
                      }
                      labelFormatter={(val) => `Group: ${xTickFormatter(val)}`}
                      contentStyle={{
                        background: '#0B0B0B',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="totalAmount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#111] border border-[#222] rounded-2xl">
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0B0B0B] text-gray-300">
                <tr>
                  <th className="px-4 py-3">Date (IST)</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Razorpay</th>
                </tr>
              </thead>
              <tbody>
                {data.orders?.length ? (
                  data.orders.map((o) => (
                    <tr
                      key={o?._id}
                      className="border-t border-[#222] hover:bg-[#0B0B0B]"
                    >
                      <td className="px-4 py-3">
                        {o?.createdAt
                          ? new Date(o.createdAt).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{o?._id}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {typeof o?.user === 'object' && o?.user?._id
                          ? o.user._id
                          : String(o?.user || '-')}
                      </td>
                      <td className="px-4 py-3">{formatINR(o?.price)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            o?.status === 'Delivered'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : o?.status === 'Shipped'
                              ? 'bg-sky-500/20 text-sky-300'
                              : o?.status === 'Processing'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : o?.status === 'Pending'
                              ? 'bg-gray-500/20 text-gray-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {o?.status || '-'}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs truncate max-w-[180px]"
                        title={o?.razorpayPaymentId || ''}
                      >
                        {o?.razorpayPaymentId || ''}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No orders for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pb-6">
          Timezone: Asia/Kolkata • Color theme: #0A0A0A / #E5C870 / White
        </div>
      </div>
    </div>
  );
}
