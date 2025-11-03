import React, { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "../config/api.js";

const API_BASE = API_BASE_URL;
const ACCENT = "#E5C870";
const BG = "#0A0A0A";

// ----------------- helpers -----------------
const emptyTier = (min = 1, max = 1, cost = 0) => ({
  minqty: String(min),
  maxqty: String(max),
  cost: String(cost),
});
const toTierList = (x) => {
  if (Array.isArray(x)) {
    return x.map((t) => ({
      minqty: String(t.minqty ?? t.minQty ?? 1),
      maxqty: String(t.maxqty ?? t.maxQty ?? t.minqty ?? t.minQty ?? 1),
      cost:   String(t.cost ?? 0),
    }));
  }
  if (x && typeof x === "object" && ("minqty" in x || "minQty" in x)) {
    const minqty = x.minqty ?? x.minQty ?? 1;
    const maxqty = x.maxqty ?? x.maxQty ?? minqty;
    const cost = x.cost ?? 0;
    return [{ minqty: String(minqty), maxqty: String(maxqty), cost: String(cost) }];
  }
  return [emptyTier()];
};
const numOrEmpty = (v) => (Number.isFinite(v) ? v : "");




const sortTiers = (arr) =>
  [...arr].sort((a, b) => Number(a?.minqty ?? 0) - Number(b?.minqty ?? 0));

const num = (v) => {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : NaN;
};

const sanitizeTier = (t) => {
  const mn = num(t.minqty), mx = num(t.maxqty), c = num(t.cost);
  const minqty = Number.isFinite(mn) && mn >= 1 ? mn : 1;
  const maxqty = Number.isFinite(mx) && mx >= minqty ? mx : minqty;
  const cost   = Number.isFinite(c) && c >= 0 ? c : 0;
  return { minqty, maxqty, cost };
};

const validate = (tiers) => {
  const s = sortTiers(tiers);
  const issues = [];
  for (let i = 0; i < s.length; i++) {
    const t = s[i];
    const min = num(t.minqty), max = num(t.maxqty), cost = num(t.cost);
    if (!Number.isFinite(min) || min < 1) issues.push(`Row ${i + 1}: minqty >= 1`);
    if (!Number.isFinite(max) || max < min) issues.push(`Row ${i + 1}: maxqty >= minqty`);
    if (!Number.isFinite(cost) || cost < 0) issues.push(`Row ${i + 1}: cost >= 0`);
    if (i > 0) {
      const prevMax = num(s[i - 1].maxqty);
      if (Number.isFinite(prevMax) && min <= prevMax) {
        issues.push(`Row ${i + 1}: overlaps previous max (${s[i - 1].maxqty})`);
      }
    }
  }
  return issues;
};

const classNames = (...c) => c.filter(Boolean).join(" ");
const Card = ({ children, className }) => (
  <div className={classNames("rounded-2xl p-5 border", className)} />
);

// ----------------- Read-only list (previous/saved) -----------------
function ReadOnlyTierList({ title, rows }) {
  return (
    <div className="rounded-2xl p-5 border bg-black/10 border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">{title}</h4>
      </div>
      {(!rows || rows.length === 0) ? (
        <div className="text-gray-400 text-sm">No data saved yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800/40">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Min</th>
                <th className="px-3 py-2 text-left">Max</th>
                <th className="px-3 py-2 text-left">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{r.minqty}</td>
                  <td className="px-3 py-2">{r.maxqty}</td>
                  <td className="px-3 py-2">{r.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------- TierTable (local state for typing) -----------------
function TierTable({ label, rowsFromParent, onCommitRows, onReset }) {
  const [localRows, setLocalRows] = useState(() => toTierList(rowsFromParent));

  // keep inputs in sync when parent changes (refresh/reset/save)
  useEffect(() => {
    setLocalRows(toTierList(rowsFromParent));
  }, [rowsFromParent]);

  const issues = useMemo(() => validate(localRows), [localRows]);

  const setCell = (idx, key, raw) =>
    setLocalRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: raw } : r)));

  const coerceAndCommit = (idx, key) => {
    setLocalRows((prev) => {
      const cur = prev[idx];
      if (!cur) return prev;
      let n = Number(String(cur[key] ?? "").trim());
      if (!Number.isFinite(n)) {
        if (key === "minqty") n = 1;
        else if (key === "maxqty") n = Number(cur.minqty) || 1;
        else n = 0;
      }
      if (key === "minqty" && n < 1) n = 1;
      if (key === "maxqty" && n < (Number(cur.minqty) || 1)) n = Number(cur.minqty) || 1;
      if (key === "cost" && n < 0) n = 0;

      const next = prev.map((r, i) => (i === idx ? { ...r, [key]: String(n) } : r));
      onCommitRows(next.map(sanitizeTier)); // push numbers to parent
      return next;
    });
  };

  const addRow = () => {
    setLocalRows((prev) => {
      const s = sortTiers(prev);
      const last = s[s.length - 1] || { maxqty: "0" };
      const nextMin = (Number(last.maxqty) || 0) + 1;
      const next = sortTiers([...prev, emptyTier(nextMin, nextMin, 0)]);
      onCommitRows(next.map(sanitizeTier));
      return next;
    });
  };

  const removeRow = (idx) => {
    setLocalRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      onCommitRows(next.map(sanitizeTier));
      return next;
    });
  };

  const sortNow = () => {
    setLocalRows((prev) => {
      const next = sortTiers(prev);
      onCommitRows(next.map(sanitizeTier));
      return next;
    });
  };
  



  return (
    <div className="rounded-2xl p-5 border bg-black/20 border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{label}</h3>
        <div className="flex gap-2">
          <button onClick={sortNow} className="px-3 py-1 rounded border" style={{ borderColor: ACCENT, color: ACCENT }}>
            Sort
          </button>
          <button onClick={addRow} className="px-3 py-1 rounded" style={{ background: ACCENT, color: BG }}>
            Add Tier
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1 rounded border hover:bg-gray-800"
            style={{ borderColor: "#4b5563", color: "#e5e7eb" }}
            title="Reset to saved data"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "#1f2937" }}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800/60">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Min Qty</th>
              <th className="px-3 py-2 text-left">Max Qty</th>
              <th className="px-3 py-2 text-left">Cost (per unit)</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localRows.map((r, i) => (
              <tr key={i} className="border-t border-gray-800">
                <td className="px-3 py-2 align-middle">{i + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="text" inputMode="numeric" placeholder="e.g. 1"
                    value={r.minqty ?? ""}
                    onChange={(e) => setCell(i, "minqty", e.target.value)}
                    onBlur={() => coerceAndCommit(i, "minqty")}
                    className="w-32 bg-transparent border rounded px-2 py-1 focus:outline-none focus:ring-1"
                    style={{ borderColor: "#374151" }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text" inputMode="numeric" placeholder="e.g. 100"
                    value={r.maxqty ?? ""}
                    onChange={(e) => setCell(i, "maxqty", e.target.value)}
                    onBlur={() => coerceAndCommit(i, "maxqty")}
                    className="w-32 bg-transparent border rounded px-2 py-1 focus:outline-none focus:ring-1"
                    style={{ borderColor: "#374151" }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text" inputMode="decimal" placeholder="e.g. 2.50"
                    value={r.cost ?? ""}
                    onChange={(e) => setCell(i, "cost", e.target.value)}
                    onBlur={() => coerceAndCommit(i, "cost")}
                    className="w-40 bg-transparent border rounded px-2 py-1 focus:outline-none focus:ring-1"
                    style={{ borderColor: "#374151" }}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => removeRow(i)}
                    className="px-3 py-1 rounded border hover:bg-gray-800"
                    style={{ borderColor: "#4b5563", color: "#f87171" }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {localRows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-gray-400" colSpan={5}>
                  No tiers yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <div className="mt-2 text-xs text-rose-300">
          <ul className="list-disc pl-5">{issues.map((m, idx) => <li key={idx}>{m}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ----------------- Page -----------------
export default function ChargePlanManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [qty, setQty] = useState(50);
const [preview, setPreview] = useState(null);
const simulate = async () => {
  setPreview(null);
  setError("");
  try {
    const res = await fetch(`${API_BASE}/api/chargeplan/totals?qty=${qty}`);
    const json = await res.json();
    if (json.success) setPreview(json.data);
    else setError(json.error || "Failed to simulate");
  } catch (e) {
    setError(e.message);
  }
};



  // draft plan being edited (numbers)
  const [plan, setPlan] = useState({
    pakageingandforwarding: [sanitizeTier({ minqty: 1, maxqty: 1, cost: 0 })],
    printingcost:           [sanitizeTier({ minqty: 1, maxqty: 1, cost: 0 })],
    gst:                    [sanitizeTier({ minqty: 1, maxqty: 1, cost: 0 })],
  });

  // last saved values from server (numbers) — shown in UI as “previous data”
  const [savedPlan, setSavedPlan] = useState({
    pakageingandforwarding: [],
    printingcost: [],
    gst: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/chargeplan`);
        const json = await res.json();
        if (!alive) return;
        if (json.success) {
          const server = {
            pakageingandforwarding: (json.data.pakageingandforwarding || []).map(sanitizeTier),
            printingcost:           (json.data.printingcost || []).map(sanitizeTier),
            gst:                    (json.data.gst || []).map(sanitizeTier),
          };
          setSavedPlan(server); // show previous
          setPlan(server);      // start draft from saved
          setError("");
        } else {
          setError(json.error || "Failed to load plan");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setOk(""); setError("");
    try {
      setSaving(true);
      const payload = {
        pakageingandforwarding: plan.pakageingandforwarding,
        printingcost:           plan.printingcost,
        gst:                    plan.gst,
      };
      const res = await fetch(`${API_BASE}/api/chargeplan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        const server = {
          pakageingandforwarding: (json.data.pakageingandforwarding || []).map(sanitizeTier),
          printingcost:           (json.data.printingcost || []).map(sanitizeTier),
          gst:                    (json.data.gst || []).map(sanitizeTier),
        };
        setOk("Saved successfully ✔");
        setSavedPlan(server); // update previous data
        setPlan(server);      // sync draft to saved
      } else setError(json.error || "Failed to save");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setError(""); setOk("");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/chargeplan`);
      const json = await res.json();
      if (json.success) {
        const server = {
          pakageingandforwarding: (json.data.pakageingandforwarding || []).map(sanitizeTier),
          printingcost:           (json.data.printingcost || []).map(sanitizeTier),
          gst:                    (json.data.gst || []).map(sanitizeTier),
        };
        setSavedPlan(server);
        setPlan(server);
      } else setError(json.error || "Failed to refresh");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const card = "rounded-2xl p-5 border";

  return (
    <div className="min-h-screen" style={{ background: BG, color: "#FFFFFF" }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: ACCENT }}>Charge Plan Manager</h1>
          <p className="text-sm text-gray-300">Edit tiers and compare with previously saved data.</p>
        </header>

        {error && <div className={classNames(card, "mb-6 bg-rose-900/30 border-rose-700 text-rose-200")}>{error}</div>}
        {ok && <div className={classNames(card, "mb-6 bg-emerald-900/30 border-emerald-700 text-emerald-200")}>{ok}</div>}

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={save}
            disabled={saving || loading}
            className={classNames("px-4 py-2 rounded-xl font-medium disabled:opacity-50", saving ? "cursor-wait" : "hover:opacity-90")}
            style={{ background: ACCENT, color: BG }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-medium border hover:bg-gray-800 disabled:opacity-50"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            Refresh from Server
          </button>
        </div>

        {/* Packaging & Forwarding */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TierTable
            label="Packaging & Forwarding (Draft)"
            rowsFromParent={plan.pakageingandforwarding}
            onCommitRows={(numericRows) =>
              setPlan((p) => ({ ...p, pakageingandforwarding: numericRows }))
            }
            onReset={() =>
              setPlan((p) => ({ ...p, pakageingandforwarding: savedPlan.pakageingandforwarding }))
            }
          />
          <ReadOnlyTierList
            title="Packaging & Forwarding — Saved on server"
            rows={savedPlan.pakageingandforwarding}
          />
        </div>

        {/* Printing Cost */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TierTable
            label="Printing Cost (Draft)"
            rowsFromParent={plan.printingcost}
            onCommitRows={(numericRows) =>
              setPlan((p) => ({ ...p, printingcost: numericRows }))
            }
            onReset={() =>
              setPlan((p) => ({ ...p, printingcost: savedPlan.printingcost }))
            }
          />
          <ReadOnlyTierList
            title="Printing Cost — Saved on server"
            rows={savedPlan.printingcost}
          />
        </div>

        {/* GST */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TierTable
            label="GST (Draft)"
            rowsFromParent={plan.gst}
            onCommitRows={(numericRows) =>
              setPlan((p) => ({ ...p, gst: numericRows }))
            }
            onReset={() =>
              setPlan((p) => ({ ...p, gst: savedPlan.gst }))
            }
          />
          <ReadOnlyTierList
            title="GST — Saved on server"
            rows={savedPlan.gst}
          />
        </div>
        {/* Simulator */}
<section className={classNames(card, "bg-black/20 border-gray-800 mt-6")}>
  <h3 className="text-lg font-semibold mb-3">Quick Simulator</h3>
  <div className="flex flex-wrap items-end gap-3">
    <label className="text-sm">
      <span className="block text-gray-300 mb-1">Quantity</span>
      <input
        type="number"
        min={1}
        value={numOrEmpty(qty)}
        onChange={(e) =>
          setQty(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 1)
        }
        className="bg-transparent border rounded px-3 py-2 focus:outline-none focus:ring-1"
        style={{ borderColor: "#374151" }}
      />
    </label>
    <button
      onClick={simulate}
      className="px-4 py-2 rounded-xl font-medium"
      style={{ background: ACCENT, color: BG }}
    >
      Compute Totals
    </button>
  </div>

  {preview && (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl bg-gray-900/50">
        <div className="text-xs text-gray-400">Qty</div>
        <div className="text-xl font-semibold">{preview.qty}</div>
      </div>
      <div className="p-4 rounded-xl bg-gray-900/50">
        <div className="text-xs text-gray-400">Packaging & Fwd (per-unit)</div>
        <div className="text-lg">{preview.perUnit?.pakageingandforwarding}</div>
      </div>
      <div className="p-4 rounded-xl bg-gray-900/50">
        <div className="text-xs text-gray-400">Printing (per-unit)</div>
        <div className="text-lg">{preview.perUnit?.printingcost}</div>
      </div>
      <div className="p-4 rounded-xl bg-gray-900/50">
        <div className="text-xs text-gray-400">GST (per-unit)</div>
        <div className="text-lg">{preview.perUnit?.gst}</div>
      </div>
      <div className="p-4 rounded-xl bg-gray-900/50 sm:col-span-2 lg:col-span-4">
        <div className="text-xs text-gray-400">Grand Total</div>
        <div className="text-2xl font-bold" style={{ color: ACCENT }}>
          {preview.totals?.grandTotal}
        </div>
      </div>
    </div>
  )}
</section>


        {loading && (
          <div className="fixed inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
            <div className="px-4 py-3 rounded-xl border" style={{ borderColor: ACCENT }}>
              <div className="animate-pulse text-sm" style={{ color: ACCENT }}>Loading…</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
