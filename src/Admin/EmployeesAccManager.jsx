// src/pages/EmployeesAccManager.jsx
import { useEffect, useMemo, useState } from "react";

/* ===========================================
   API LAYER (INLINE)
   Keep endpoints centralized & typed here
   =========================================== */

const API_BASE = "https://duco-67o5.onrender.com/";

/** Build querystring for GET /employeesacc?url=&employeeid= */
const getEmployeesAcc = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/employeesacc${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch employees: ${res.status}`);
  return res.json(); // -> Array<EmployeeAcc> (server omits passwords)
};

/** POST /employeesacc  (create new) */
const createEmployeeAcc = async (payload) => {
  const res = await fetch(`${API_BASE}/employeesacc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Create failed: ${res.status}`);
  }
  return res.json(); // -> created EmployeeAcc (without password)
};

/** PATCH /employeesacc/:id  (partial update) */
const updateEmployeeAcc = async (id, payload) => {
  const res = await fetch(`${API_BASE}/employeesacc/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Update failed: ${res.status}`);
  }
  return res.json(); // -> updated EmployeeAcc (without password)
};

/* ===========================================
   THEME TOKENS
   =========================================== */
const BG = "#0A0A0A";
const ACCENT = "#E5C870";

/* ===========================================
   SMALL UI PRIMITIVES
   =========================================== */
const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="text-sm text-gray-300">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const Button = ({
  children,
  type = "button",
  onClick,
  disabled,
  className = "",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-2xl font-medium transition shadow-md hover:opacity-90 disabled:opacity-60 ${className}`}
    style={{ backgroundColor: ACCENT, color: BG }}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-2xl border transition hover:bg-white/10 ${className}`}
    style={{ borderColor: ACCENT, color: ACCENT }}
  >
    {children}
  </button>
);

/* ===========================================
   EMPTY SHAPES
   =========================================== */
const emptyForm = {
  url: "",
  employeeid: "",
  password: "",
  employeesdetails: { name: "", email: "", role: "" },
  employeesNote: "",
};

/* ===========================================
   MAIN PAGE
   =========================================== */
const EmployeesAccManager = () => {
  // list state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // filters
  const [filters, setFilters] = useState({ url: "", employeeid: "" });

  console.log(rows);

  // create state
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // edit state
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState(emptyForm);

  // derived table data (handy if you add in-memory filtering later)
  const data = useMemo(() => rows, [rows]);

  /* -----------------------------
     LOAD DATA
  ------------------------------*/
  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.url.trim()) params.url = filters.url.trim();
      if (filters.employeeid.trim())
        params.employeeid = filters.employeeid.trim();
      const list = await getEmployeesAcc(params);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------
     CREATE HANDLERS
  ------------------------------*/
  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.url || !form.employeeid || !form.password) {
      alert("url, employeeid and password are required.");
      return;
    }
    setSaving(true);
    try {
      await createEmployeeAcc(form);
      setForm(emptyForm);
      await fetchAll();
      alert("Employee created");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------
     EDIT HANDLERS
  ------------------------------*/
  const openEdit = (row) => {
    setEditId(row._id);
    setEdit({
      url: row.url || "",
      employeeid: row.employeeid || "",
      password: "", // keep blank so we don't overwrite unless user types it
      employeesdetails: {
        name: row.employeesdetails?.name || "",
        email: row.employeesdetails?.email || "",
        role: row.employeesdetails?.role || "",
      },
      employeesNote: row.employeesNote || "",
    });
  };

  const submitEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const payload = { ...edit };
      if (!payload.password) delete payload.password; // do not send blank password
      await updateEmployeeAcc(editId, payload);
      setEditId(null);
      await fetchAll();
      alert("Employee updated");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const closeEdit = () => setEditId(null);

  /* ===========================================
     RENDER
     =========================================== */
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BG, color: "#FFFFFF" }}
    >
      <div className="max-w-6xl mx-auto p-6">
        {/* HEADER */}
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Employees Access Manager</h1>
          <GhostBtn onClick={fetchAll}>Refresh</GhostBtn>
        </header>

        {/* FILTERS */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Filter by URL">
            <input
              value={filters.url}
              onChange={(e) =>
                setFilters((s) => ({ ...s, url: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
              placeholder="acme.example.com"
            />
          </Field>
          <Field label="Filter by Employee ID">
            <input
              value={filters.employeeid}
              onChange={(e) =>
                setFilters((s) => ({ ...s, employeeid: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
              placeholder="EMP001"
            />
          </Field>
          <div className="flex items-end gap-3">
            <Button onClick={fetchAll}>Apply Filters</Button>
            <GhostBtn
              onClick={() => {
                setFilters({ url: "", employeeid: "" });
                fetchAll();
              }}
            >
              Clear
            </GhostBtn>
          </div>
        </section>

        {/* CREATE CARD */}
        <section
          className="mb-10 rounded-3xl p-5 shadow-lg border"
          style={{ borderColor: ACCENT }}
        >
          <h2 className="text-xl font-semibold mb-4">Create Employee Access</h2>

          <form
            onSubmit={onCreate}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <Field label="URL" required>
              <input
                value={form.url}
                onChange={(e) =>
                  setForm((s) => ({ ...s, url: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="acme.example.com"
              />
            </Field>

            <Field label="Employee ID" required>
              <input
                value={form.employeeid}
                onChange={(e) =>
                  setForm((s) => ({ ...s, employeeid: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="EMP001"
              />
            </Field>

            <Field label="Password" required>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((s) => ({ ...s, password: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="••••••••"
              />
            </Field>

            <Field label="Name">
              <input
                value={form.employeesdetails.name}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    employeesdetails: {
                      ...s.employeesdetails,
                      name: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="Rohit"
              />
            </Field>

            <Field label="Email">
              <input
                value={form.employeesdetails.email}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    employeesdetails: {
                      ...s.employeesdetails,
                      email: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="rohit@example.com"
              />
            </Field>

            <Field label="Role">
              <input
                value={form.employeesdetails.role}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    employeesdetails: {
                      ...s.employeesdetails,
                      role: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="Manager"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Note">
                <textarea
                  rows={3}
                  value={form.employeesNote}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, employeesNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  placeholder="Any internal note…"
                />
              </Field>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </Button>
              <GhostBtn onClick={() => setForm(emptyForm)}>Reset</GhostBtn>
            </div>
          </form>
        </section>

        {/* LIST TABLE */}
        <section
          className="rounded-3xl p-5 shadow-lg border"
          style={{ borderColor: ACCENT }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">All Employees</h2>
            {loading && <span className="text-sm text-gray-400">Loading…</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="py-2 pr-4">URL</th>
                  <th className="py-2 pr-4">Employee ID</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Note</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && data.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-gray-400">
                      No records found
                    </td>
                  </tr>
                )}

                {data.map((row) => (
                  <tr key={row._id} className="border-b border-white/5">
                    <td className="py-2 pr-4">{row.url}</td>
                    <td className="py-2 pr-4">{row.employeeid}</td>
                    <td className="py-2 pr-4">
                      {row.employeesdetails?.name || "-"}
                    </td>
                    <td className="py-2 pr-4">
                      {row.employeesdetails?.email || "-"}
                    </td>
                    <td className="py-2 pr-4">
                      {row.employeesdetails?.role || "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="line-clamp-2">
                        {row.employeesNote || "-"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <GhostBtn onClick={() => openEdit(row)}>Edit</GhostBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* EDIT MODAL */}
        {editId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div
              className="w-full max-w-3xl  rounded-3xl p-6 shadow-xl relative"
              style={{ backgroundColor: BG, border: `1px solid ${ACCENT}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Update Employee</h3>
                <button
                  onClick={closeEdit}
                  className="text-gray-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="URL" required>
                  <input
                    value={edit.url}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, url: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Employee ID" required>
                  <input
                    value={edit.employeeid}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, employeeid: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Password (leave blank to keep same)">
                  <input
                    type="password"
                    value={edit.password}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, password: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="Name">
                  <input
                    value={edit.employeesdetails.name}
                    onChange={(e) =>
                      setEdit((s) => ({
                        ...s,
                        employeesdetails: {
                          ...s.employeesdetails,
                          name: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={edit.employeesdetails.email}
                    onChange={(e) =>
                      setEdit((s) => ({
                        ...s,
                        employeesdetails: {
                          ...s.employeesdetails,
                          email: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Role">
                  <input
                    value={edit.employeesdetails.role}
                    onChange={(e) =>
                      setEdit((s) => ({
                        ...s,
                        employeesdetails: {
                          ...s.employeesdetails,
                          role: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Note">
                    <textarea
                      rows={3}
                      value={edit.employeesNote}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...s,
                          employeesNote: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={submitEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
                <GhostBtn onClick={closeEdit}>Cancel</GhostBtn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesAccManager;
