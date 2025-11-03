import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * BankDetailsManager.jsx
 *
 * UI to Create & Update Bank/UPI details, and mark one record as Active.
 *
 * Endpoints expected (adjust API_BASE if needed):
 *   GET   /api/bankdetails
 *   POST  /api/bankdetails
 *   PATCH /api/bankdetails/:id
 *
 * Design Tokens:
 *   - Background: #0A0A0A
 *   - Text:       #FFFFFF
 *   - Accent:     #E5C870
 */
import { API_BASE_URL } from "../config/api.js";

const API_BASE = API_BASE_URL;
const ACCENT = "#E5C870";
const BG = "#0A0A0A";

const emptyForm = {
  bankdetails: {
    bankname: "",
    accountnumber: "",
    ifsccode: "",
    branch: "",
  },
  upidetails: {
    upiid: "",
    upiname: "",
  },
  isactive: false,
};

const Field = ({ label, children, required }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-300">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl p-5 shadow-[0_0_0_1px_rgba(229,200,112,0.25)] bg-[#111] ${className}`}
  >
    {children}
  </div>
);

const Pill = ({ children, tone = "default" }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold select-none ${
      tone === "active"
        ? "bg-[--accent]/20 text-[--accent] border border-[--accent]/40"
        : "bg-white/5 text-white/80 border border-white/10"
    }`}
    style={{ ["--accent"]: ACCENT }}
  >
    {children}
  </span>
);

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}) => {
  const classes = {
    primary:
      "inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-sm bg-[--accent] text-black hover:opacity-90 active:opacity-80 disabled:opacity-50",
    ghost:
      "inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-sm text-white/90 hover:bg-white/10 border border-white/10",
    danger:
      "inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-sm text-white bg-red-600/80 hover:bg-red-600 disabled:opacity-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={classes[variant]}
      disabled={disabled}
      style={{ ["--accent"]: ACCENT }}
    >
      {children}
    </button>
  );
};

export default function BankDetailsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");

  const hasItems = useMemo(() => items && items.length > 0, [items]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/api/bankdetails`);
      setItems(data?.data || []);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onChange = (path, value) => {
    // path like "bankdetails.bankname" or "upidetails.upiid" or "isactive"
    setForm((prev) => {
      const next = { ...prev };
      const parts = path.split(".");
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setError("");
  };

  const maskAccount = (acc = "") =>
    acc.length <= 4
      ? acc
      : `${"*".repeat(Math.max(0, acc.length - 4))}${acc.slice(-4)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await axios.patch(`${API_BASE}/api/bankdetails/${editId}`, form);
      } else {
        await axios.post(`${API_BASE}/api/bankdetails`, form);
      }
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setForm({
      bankdetails: {
        bankname: item.bankdetails?.bankname || "",
        accountnumber: item.bankdetails?.accountnumber || "",
        ifsccode: item.bankdetails?.ifsccode || "",
        branch: item.bankdetails?.branch || "",
      },
      upidetails: {
        upiid: item.upidetails?.upiid || "",
        upiname: item.upidetails?.upiname || "",
      },
      isactive: !!item.isactive,
    });
  };

  const cancelEdit = () => resetForm();

  const setActive = async (id) => {
    // Set one active: chosen -> true, others -> false
    try {
      setSaving(true);
      // Turn off all actives in parallel (except target)
      const others = items.filter((x) => x._id !== id && x.isactive);
      await Promise.all([
        axios.patch(`${API_BASE}/api/bankdetails/${id}`, { isactive: true }),
        ...others.map((o) =>
          axios.patch(`${API_BASE}/api/bankdetails/${o._id}`, {
            isactive: false,
          })
        ),
      ]);
      await fetchAll();
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to set active"
      );
    } finally {
      setSaving(false);
    }
  };
  const startDelete = async (item) => {
    try {
      setSaving(true);
      setDeleteId(item._id);
      await axios.delete(`${API_BASE}/api/bankdetails/${item._id}`);
      await fetchAll();
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete");
    } finally {
      setSaving(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="mx-auto max-w-6xl px-4 py-10 text-white">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Bank & UPI Details
          </h1>
          <div className="flex items-center gap-3">
            <Pill tone="default">Total: {items.length}</Pill>
            <Pill tone="active">
              Active: {items.filter((i) => i.isactive).length}
            </Pill>
          </div>
        </header>

        {/* Form */}
        <Card className="mb-10">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-2">
                {editId ? "Update Details" : "Create New Details"}
              </h2>
              <p className="text-sm text-white/70">
                Fill bank & UPI info. You can mark a record active after saving,
                or toggle it from the list.
              </p>
            </div>

            <Field label="Bank Name" required>
              <input
                value={form.bankdetails.bankname}
                onChange={(e) =>
                  onChange("bankdetails.bankname", e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[--accent]"
                placeholder="e.g. HDFC Bank"
                style={{ ["--accent"]: ACCENT }}
                required
              />
            </Field>

            <Field label="IFSC Code" required>
              <input
                value={form.bankdetails.ifsccode}
                onChange={(e) =>
                  onChange("bankdetails.ifsccode", e.target.value.toUpperCase())
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[--accent]"
                placeholder="e.g. HDFC0001234"
                style={{ ["--accent"]: ACCENT }}
                required
              />
            </Field>

            <Field label="Account Number" required>
              <input
                value={form.bankdetails.accountnumber}
                onChange={(e) =>
                  onChange(
                    "bankdetails.accountnumber",
                    e.target.value.replace(/\s/g, "")
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[--accent]"
                placeholder="e.g. 123456789012"
                style={{ ["--accent"]: ACCENT }}
                inputMode="numeric"
                required
              />
            </Field>

            <Field label="Branch" required>
              <input
                value={form.bankdetails.branch}
                onChange={(e) => onChange("bankdetails.branch", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[--accent]"
                placeholder="e.g. Uttam Nagar, New Delhi"
                style={{ ["--accent"]: ACCENT }}
                required
              />
            </Field>

            <Field label="UPI ID" required>
              <input
                value={form.upidetails.upiid}
                onChange={(e) => onChange("upidetails.upiid", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[--accent]"
                placeholder="e.g. name@bank"
                style={{ ["--accent"]: ACCENT }}
                required
              />
            </Field>

            <Field label="UPI Name" required>
              <input
                value={form.upidetails.upiname}
                onChange={(e) => onChange("upidetails.upiname", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[--accent]"
                placeholder="e.g. WebDesino Pvt. Ltd."
                style={{ ["--accent"]: ACCENT }}
                required
              />
            </Field>

            <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={form.isactive}
                    onChange={(e) => onChange("isactive", e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-[--accent] focus:ring-[--accent]"
                    style={{ ["--accent"]: ACCENT }}
                  />
                  <span className="text-sm text-white/80">
                    Mark this record Active (on save)
                  </span>
                </label>
              </div>
              <div className="flex items-center bg-white gap-3">
                {editId && (
                  <Button variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={saving}>
                  {editId ? "Update" : "Create"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="md:col-span-2 text-sm text-rose-400">{error}</div>
            )}
          </form>
        </Card>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <Card>
              <div className="animate-pulse text-white/70">
                Loading bank details…
              </div>
            </Card>
          ) : !hasItems ? (
            <Card>
              <div className="text-white/70">
                No records yet. Create your first bank/UPI detail above.
              </div>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item._id} className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {item.bankdetails?.bankname || "—"}
                      </h3>
                      {item.isactive ? (
                        <Pill tone="active">Active</Pill>
                      ) : (
                        <Pill>Inactive</Pill>
                      )}
                    </div>
                    <div className="text-sm text-white/80 space-y-1">
                      <div>
                        <span className="text-white/50">IFSC:</span>{" "}
                        {item.bankdetails?.ifsccode || "—"}
                      </div>
                      <div>
                        <span className="text-white/50">A/C:</span>{" "}
                        {maskAccount(item.bankdetails?.accountnumber)}
                      </div>
                      <div>
                        <span className="text-white/50">Branch:</span>{" "}
                        {item.bankdetails?.branch || "—"}
                      </div>
                      <div>
                        <span className="text-white/50">UPI:</span>{" "}
                        {item.upidetails?.upiid || "—"} (
                        {item.upidetails?.upiname || "—"})
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Button variant="ghost" onClick={() => startEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => startDelete(item)}>
                    Delete
                  </Button>
                  {!item.isactive ? (
                    <Button variant="ghost" onClick={() => setActive(item._id)}>
                      Set Active
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => setActive(item._id)}>
                      Make Default Again
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        <footer className="mt-10 text-xs text-white/50">
          Tip: Only one record should be active. When you click{" "}
          <span style={{ color: ACCENT }}>Set Active</span>, others will be
          toggled off automatically.
        </footer>
      </div>
    </div>
  );
}
