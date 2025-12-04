import React, { useEffect, useMemo, useState } from "react";

/**
 * Invoice Settings Panel
 * ----------------------
 * A small React + Tailwind admin panel to view/update a single JSON document via your Node routes.
 *
 * Backend endpoints used (from your Express routes):
 *  GET  /data         -> fetch current data.json
 *  PUT  /data         -> update (deep-merge) fields into data.json
 *  POST /data/reset   -> reset to initial template
 *
 * How to use:
 * 1) Ensure your backend is running (server listens on http://localhost:5000).
 * 2) If serving this panel from a different origin, enable CORS on the backend.
 * 3) Drop this component in your React app (e.g., <App/>). Tailwind must be configured.
 */

import { API_BASE_URL } from "../config/api.js";

const API_BASE = API_BASE_URL; // Backend API URL

const initialShape = {
  company: {
    name: "",
    address: "",
    gstin: "",
    cin: "",
    email: "",
    pan: "",
    iec: "",
    gst: "",
    state: "", // 👈 added company state
  },
  invoice: {
    placeOfSupply: "",
    reverseCharge: false,
    copyType: "Original Copy",
  },
  terms: [],
  forCompany: "",
};

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}
function TermsEditor({ terms, onChange }) {
  const list = Array.isArray(terms) ? terms : [];
  function add() { onChange([...list, ""]); }
  function update(idx, val) {
    const clone = [...list];
    clone[idx] = val;
    onChange(clone);
  }
  function remove(idx) {
    const clone = [...list];
    clone.splice(idx, 1);
    onChange(clone.length ? clone : [""]); // keeps at least one box visible in UI
  }
  return (
    <div className="space-y-3">
      {(list.length ? list : [""]).map((t, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
            rows={2}
            value={t}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Term ${i + 1}`}
          />
          <div className="flex flex-col gap-2">
            <button onClick={() => remove(i)} className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-100">
              Delete
            </button>
            {i === (list.length || 1) - 1 && (
              <button onClick={add} className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-100">
                Add
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


export default function Invoice() {
  const [data, setData] = useState(initialShape);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch data on mount
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/data`, { method: "GET" });
      if (!res.ok) throw new Error(`GET /data failed: ${res.status}`);
      const json = await res.json();
      setData(mergeDeep(structuredClone(initialShape), json));
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`PUT /data failed: ${res.status}`);
      const json = await res.json();
      setData(mergeDeep(structuredClone(initialShape), json));
      setSuccess("Saved successfully");
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 2500);
    }
  }

  async function resetToInitial() {
    if (!confirm("Reset to initial blank template? This cannot be undone.")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/data/reset`, { method: "POST" });
      if (!res.ok) throw new Error(`POST /data/reset failed: ${res.status}`);
      const json = await res.json();
      setData(mergeDeep(structuredClone(initialShape), json));
      setSuccess("Reset complete");
    } catch (e) {
      setError(e.message || "Failed to reset");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 2500);
    }
  }

  // Controlled field helpers
  const onChange = (path, value) => {
    setData((prev) => setByPath(structuredClone(prev), path, value));
  };

  // JSON preview (pretty)
  const prettyJson = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-6xl">
        <Header onRefresh={refresh} onSave={save} onReset={resetToInitial} saving={saving} loading={loading} />

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* LEFT: Forms */}
          <div className="md:col-span-2 space-y-6">
            <Card title="Company Details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
  label="Company State"
  value={data.company.state}
  onChange={(v) => onChange(["company", "state"], v)}
  options={[
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh",
    "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
    "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir",
    "Ladakh","Lakshadweep","Puducherry"
  ]}
/>

                <TextField label="Email" value={data.company.email} onChange={(v) => onChange(["company", "email"], v)} />
                <TextField label="GSTIN" value={data.company.gstin} onChange={(v) => onChange(["company", "gstin"], v)} />
                <TextField label="CIN" value={data.company.cin} onChange={(v) => onChange(["company", "cin"], v)} />
                <TextField label="PAN" value={data.company.pan} onChange={(v) => onChange(["company", "pan"], v)} />
                <TextField label="IEC" value={data.company.iec} onChange={(v) => onChange(["company", "iec"], v)} />
                
                <TextField label="Company State" value={data.company.state} onChange={(v) => onChange(["company", "state"], v)} /> {/* 👈 added field */}
                <TextArea  label="Address" value={data.company.address} onChange={(v) => onChange(["company", "address"], v)} rows={3} />
              </div>
            </Card>

            <Card title="Invoice Details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField label="Place of Supply" value={data.invoice.placeOfSupply} onChange={(v) => onChange(["invoice", "placeOfSupply"], v)} />
                <SelectField label="Copy Type" value={data.invoice.copyType} onChange={(v) => onChange(["invoice", "copyType"], v)} options={["Original Copy", "Duplicate Copy", "Triplicate Copy"]} />
                <ToggleField label="Reverse Charge" checked={data.invoice.reverseCharge} onChange={(v) => onChange(["invoice", "reverseCharge"], v)} />
              </div>
            </Card>

            <Card title="Terms & Conditions">
              <TermsEditor terms={data.terms} onChange={(terms) => onChange(["terms"], terms)} />
            </Card>
      
            <Card title="Signature">
              <TextField label="For Company" value={data.forCompany} onChange={(v) => onChange(["forCompany"], v)} />
            </Card>
          </div>

          {/* RIGHT: Live JSON */}
          <div className="md:col-span-1">
            <Card title="Live JSON Preview">
              <pre className="rounded-xl bg-gray-900 p-4 text-sm leading-relaxed text-gray-100 overflow-auto max-h-[70vh]">
                {prettyJson}
              </pre>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(prettyJson)}
                  className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => downloadFile("invoice-settings.json", prettyJson)}
                  className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Download
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ onRefresh, onSave, onReset, loading, saving }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice Settings Panel</h1>
        <p className="text-sm text-gray-600">Manage company, invoice, terms — stored in a single JSON via your Node routes.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-100" disabled={loading || saving}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <button onClick={onSave} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90" disabled={loading || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onReset} className="rounded-2xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100" disabled={loading || saving}>
          Reset
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-700">{label}</label>
      <input
        type={type}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder = "" }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-700">{label}</label>
      <textarea
        rows={rows}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-700">{label}</label>
      <select
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={classNames(
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-black" : "bg-gray-300"
        )}
      >
        <span
          className={classNames(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}



// ----------------- utils -----------------
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setByPath(obj, path, value) {
  if (!Array.isArray(path)) path = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
    cur = cur[key];
  }
  cur[path[path.length - 1]] = value;
  return obj;
}

function isObject(o) {
  return o && typeof o === "object" && !Array.isArray(o);
}

function mergeDeep(target, source) {
  if (!isObject(target) || !isObject(source)) return source;
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (isObject(tv) && isObject(sv)) out[key] = mergeDeep(tv, sv);
    else out[key] = sv;
  }
  return out;
}
