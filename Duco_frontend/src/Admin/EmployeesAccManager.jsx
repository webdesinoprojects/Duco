// src/pages/EmployeesAccManager.jsx
import { useEffect, useMemo, useState } from "react";

/* ===========================================
   API LAYER (INLINE)
   Keep endpoints centralized & typed here
   =========================================== */

const API_BASE = import.meta?.env?.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : (import.meta.env.DEV ? "http://localhost:3002/api" : "http://localhost:3002/api");

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

const Button = ({ children, type = "button", onClick, disabled, className = "" }) => (
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

  console.log(rows)

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
      if (filters.employeeid.trim()) params.employeeid = filters.employeeid.trim();
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

  /* -----------------------------
     DELETE HANDLER
  ------------------------------*/
  const handleDelete = async (employee) => {
    const confirmMsg = `Are you sure you want to delete this employee?\n\nEmployee ID: ${employee.employeeid}\nName: ${employee.employeesdetails?.name || 'N/A'}\nEmail: ${employee.employeesdetails?.email || 'N/A'}\n\nThis action cannot be undone!`;
    
    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/employeesacc/${employee._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || `Delete failed: ${response.status}`);
      }

      await fetchAll();
      alert('Employee deleted successfully');
    } catch (err) {
      alert(err.message || 'Failed to delete employee');
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------
     CREDENTIALS MODAL STATE
  ------------------------------*/
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  /* -----------------------------
     URL GENERATION & SHOW CREDENTIALS
  ------------------------------*/
  const generateAuthUrl = (employee) => {
    const email = employee.employeesdetails?.email;

    if (!email) {
      alert('Employee must have an email address to generate access credentials');
      return;
    }

    // Set selected employee and show modal
    setSelectedEmployee(employee);
    setShowCredentialsModal(true);
  };

  const handleCopyCredentials = () => {
    const urlParts = selectedEmployee.url.split('/');
    const section = urlParts[urlParts.length - 1];
    const baseUrl = window.location.origin;
    const directUrl = `${baseUrl}/employees/${section}`;
    
    const credentials = `Employee Access Credentials

Name: ${selectedEmployee.employeesdetails?.name || 'N/A'}
Role: ${selectedEmployee.employeesdetails?.role || 'Employee'}
Employee ID: ${selectedEmployee.employeeid}

LOGIN CREDENTIALS:
Email: ${selectedEmployee.employeesdetails?.email}
Password: [Set by admin during creation]

ACCESS URL:
${directUrl}

INSTRUCTIONS:
1. Go to: ${baseUrl}/employee-login
2. Enter your email and password
3. You will be redirected to your dashboard
4. Bookmark the URL for quick access

Permissions:
${selectedEmployee.employeesdetails?.role === 'Graphic Designer' ? '✓ Inventory, Categories, Products, Banner, Blog' : ''}
${selectedEmployee.employeesdetails?.role === 'Order Manager' ? '✓ Bulk Orders, Orders, Logistics, Set Money, Charges Plan, Corporate Settings' : ''}
${selectedEmployee.employeesdetails?.role === 'Accounting and Management' ? '✓ Bank Details, Employee Management, User Analysis, Invoice, Sales' : ''}`;

    navigator.clipboard.writeText(credentials).then(() => {
      alert('✅ Credentials copied to clipboard!');
    }).catch(() => {
      alert('❌ Failed to copy. Please copy manually from the modal.');
    });
  };

  const handleOpenURL = () => {
    const urlParts = selectedEmployee.url.split('/');
    const section = urlParts[urlParts.length - 1];
    const baseUrl = window.location.origin;
    const directUrl = `${baseUrl}/employees/${section}`;
    
    window.open(directUrl, '_blank', 'noopener,noreferrer');
  };

  /* ===========================================
     RENDER
     =========================================== */
  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: "#FFFFFF" }}>
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
              onChange={(e) => setFilters((s) => ({ ...s, url: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
              placeholder="acme.example.com"
            />
          </Field>
          <Field label="Filter by Employee ID">
            <input
              value={filters.employeeid}
              onChange={(e) => setFilters((s) => ({ ...s, employeeid: e.target.value }))}
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

          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Section URL" required>
              <input
                value={form.url}
                onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 outline-none text-white"
                placeholder="employees/username (e.g., employees/jatin)"
                style={{ backgroundColor: '#1a1a1a', color: 'white' }}
              />
              <p className="text-xs text-gray-400 mt-1">
                ⚠️ This creates a unique identifier for the employee. They will be redirected to their allowed sections based on their role.
              </p>
              <p className="text-xs text-blue-400 mt-1">
                💡 Tip: Use format "employees/[employeename]" (e.g., employees/jatin, employees/john)
              </p>
            </Field>

            <Field label="Employee ID" required>
              <input
                value={form.employeeid}
                onChange={(e) => setForm((s) => ({ ...s, employeeid: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="EMP001"
              />
            </Field>

            <Field label="Password" required>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
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
                    employeesdetails: { ...s.employeesdetails, name: e.target.value },
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
                    employeesdetails: { ...s.employeesdetails, email: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                placeholder="rohit@example.com"
              />
            </Field>

            <Field label="Role">
              <select
                value={form.employeesdetails.role}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    employeesdetails: { ...s.employeesdetails, role: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 outline-none text-white"
                style={{ 
                  backgroundColor: '#1a1a1a',
                  color: 'white'
                }}
              >
                <option value="" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>Select Role</option>
                <optgroup label="Specialized Roles" style={{ backgroundColor: '#0A0A0A', color: '#E5C870', fontWeight: 'bold' }}>
                  <option value="Graphic Designer" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>
                    🎨 Graphic Designer (Inventory, Categories, Products, Banner, Blog)
                  </option>
                  <option value="Order Manager" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>
                    📦 Order Manager (Bulk Orders, Orders, Logistics, Money, Charges, Corporate Settings)
                  </option>
                  <option value="Accounting and Management" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>
                    💼 Accounting and Management (Bank Details, Employees, Users, Invoice, Sales)
                  </option>
                </optgroup>
                <optgroup label="General Roles" style={{ backgroundColor: '#0A0A0A', color: '#E5C870', fontWeight: 'bold' }}>
                  <option value="Admin" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Admin</option>
                  <option value="Manager" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Manager</option>
                  <option value="Supervisor" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Supervisor</option>
                  <option value="Executive" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Executive</option>
                  <option value="Assistant" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Assistant</option>
                  <option value="Intern" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Intern</option>
                  <option value="Consultant" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Consultant</option>
                  <option value="Specialist" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Specialist</option>
                </optgroup>
              </select>
              {form.employeesdetails.role && (
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300 font-semibold mb-1">Access Permissions:</p>
                  <p className="text-xs text-gray-300">
                    {form.employeesdetails.role === 'Graphic Designer' && '✓ Inventory, Categories, Products, Banner, Blog'}
                    {form.employeesdetails.role === 'Order Manager' && '✓ Bulk Orders, Orders, Logistics, Set Money, Charges Plan, Corporate Settings'}
                    {form.employeesdetails.role === 'Accounting and Management' && '✓ Bank Details, Employee Management, User Analysis, Invoice, Sales'}
                    {!['Graphic Designer', 'Order Manager', 'Accounting and Management'].includes(form.employeesdetails.role) && '⚠️ No specific permissions assigned'}
                  </p>
                </div>
              )}
            </Field>

            <div className="md:col-span-2">
              <Field label="Note">
                <textarea
                  rows={3}
                  value={form.employeesNote}
                  onChange={(e) => setForm((s) => ({ ...s, employeesNote: e.target.value }))}
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
                    <td className="py-2 pr-4">{row.employeesdetails?.name || "-"}</td>
                    <td className="py-2 pr-4">{row.employeesdetails?.email || "-"}</td>
                    <td className="py-2 pr-4">{row.employeesdetails?.role || "-"}</td>
                    <td className="py-2 pr-4">
                      <span className="line-clamp-2">{row.employeesNote || "-"}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 flex-wrap">
                        <GhostBtn onClick={() => openEdit(row)}>Edit</GhostBtn>
                        <button
                          onClick={() => generateAuthUrl(row)}
                          className="px-3 py-1.5 rounded-2xl border transition hover:bg-green-500/20"
                          style={{ borderColor: '#10b981', color: '#10b981' }}
                          title="Open employee access URL in new tab"
                        >
                          🔗 Open URL
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-2xl border transition hover:bg-red-500/20 disabled:opacity-50"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                          title="Delete this employee"
                        >
                          🗑️ Delete
                        </button>
                      </div>
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
                <button onClick={closeEdit} className="text-gray-300 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="URL" required>
                  <input
                    value={edit.url}
                    onChange={(e) => setEdit((s) => ({ ...s, url: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Employee ID" required>
                  <input
                    value={edit.employeeid}
                    onChange={(e) => setEdit((s) => ({ ...s, employeeid: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Password (leave blank to keep same)">
                  <input
                    type="password"
                    value={edit.password}
                    onChange={(e) => setEdit((s) => ({ ...s, password: e.target.value }))}
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
                        employeesdetails: { ...s.employeesdetails, name: e.target.value },
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
                        employeesdetails: { ...s.employeesdetails, email: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                </Field>
                <Field label="Role">
                  <select
                    value={edit.employeesdetails.role}
                    onChange={(e) =>
                      setEdit((s) => ({
                        ...s,
                        employeesdetails: { ...s.employeesdetails, role: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 outline-none text-white"
                    style={{ 
                      backgroundColor: '#1a1a1a',
                      color: 'white'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>Select Role</option>
                    <optgroup label="Specialized Roles" style={{ backgroundColor: '#0A0A0A', color: '#E5C870', fontWeight: 'bold' }}>
                      <option value="Graphic Designer" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>
                        🎨 Graphic Designer
                      </option>
                      <option value="Order Manager" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>
                        📦 Order Manager
                      </option>
                      <option value="Accounting and Management" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>
                        💼 Accounting and Management
                      </option>
                    </optgroup>
                    <optgroup label="General Roles" style={{ backgroundColor: '#0A0A0A', color: '#E5C870', fontWeight: 'bold' }}>
                      <option value="Admin" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Admin</option>
                      <option value="Manager" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Manager</option>
                      <option value="Supervisor" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Supervisor</option>
                      <option value="Executive" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Executive</option>
                      <option value="Assistant" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Assistant</option>
                      <option value="Intern" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Intern</option>
                      <option value="Consultant" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Consultant</option>
                      <option value="Specialist" style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '8px' }}>Specialist</option>
                    </optgroup>
                  </select>
                  {edit.employeesdetails.role && (
                    <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-300 font-semibold mb-1">Access Permissions:</p>
                      <p className="text-xs text-gray-300">
                        {edit.employeesdetails.role === 'Graphic Designer' && '✓ Inventory, Categories, Products, Banner, Blog'}
                        {edit.employeesdetails.role === 'Order Manager' && '✓ Bulk Orders, Orders, Logistics, Set Money, Charges Plan, Corporate Settings'}
                        {edit.employeesdetails.role === 'Accounting and Management' && '✓ Bank Details, Employee Management, User Analysis, Invoice, Sales'}
                        {!['Graphic Designer', 'Order Manager', 'Accounting and Management'].includes(edit.employeesdetails.role) && '⚠️ No specific permissions assigned'}
                      </p>
                    </div>
                  )}
                </Field>
                <div className="md:col-span-2">
                  <Field label="Note">
                    <textarea
                      rows={3}
                      value={edit.employeesNote}
                      onChange={(e) => setEdit((s) => ({ ...s, employeesNote: e.target.value }))}
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

        {/* CREDENTIALS MODAL */}
        {showCredentialsModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div
              className="w-full max-w-2xl rounded-3xl p-6 shadow-xl relative"
              style={{ backgroundColor: BG, border: `2px solid ${ACCENT}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold" style={{ color: ACCENT }}>
                  🔐 Employee Access Credentials
                </h3>
                <button 
                  onClick={() => setShowCredentialsModal(false)} 
                  className="text-gray-300 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Employee Info */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="font-semibold mb-3" style={{ color: ACCENT }}>Employee Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <p className="font-medium">{selectedEmployee.employeesdetails?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Role:</span>
                      <p className="font-medium">{selectedEmployee.employeesdetails?.role || 'Employee'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Employee ID:</span>
                      <p className="font-medium">{selectedEmployee.employeeid}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Section:</span>
                      <p className="font-medium">{selectedEmployee.url.split('/').pop()}</p>
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                  <h4 className="font-semibold mb-3 text-green-400">🔑 Login Credentials</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <p className="font-mono font-medium text-green-300">{selectedEmployee.employeesdetails?.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Password:</span>
                      <p className="font-medium text-yellow-300">⚠️ [Set by admin during creation]</p>
                      <p className="text-xs text-gray-400 mt-1">Note: Share the password you set when creating this employee account</p>
                    </div>
                  </div>
                </div>

                {/* Access URL */}
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                  <h4 className="font-semibold mb-3 text-blue-400">🔗 Access URL</h4>
                  <div className="space-y-2">
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-sm break-all">
                      {window.location.origin}/employee-login
                    </div>
                    <p className="text-xs text-gray-400">
                      Employee should go to this URL and login with their email and password
                    </p>
                  </div>
                </div>

                {/* Permissions */}
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                  <h4 className="font-semibold mb-3 text-purple-400">✓ Access Permissions</h4>
                  <p className="text-sm text-gray-300">
                    {selectedEmployee.employeesdetails?.role === 'Graphic Designer' && '✓ Inventory, Categories, Products, Banner, Blog'}
                    {selectedEmployee.employeesdetails?.role === 'Order Manager' && '✓ Bulk Orders, Orders, Logistics, Set Money, Charges Plan, Corporate Settings'}
                    {selectedEmployee.employeesdetails?.role === 'Accounting and Management' && '✓ Bank Details, Employee Management, User Analysis, Invoice, Sales'}
                    {!['Graphic Designer', 'Order Manager', 'Accounting and Management'].includes(selectedEmployee.employeesdetails?.role) && '⚠️ No specific permissions assigned'}
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="font-semibold mb-3" style={{ color: ACCENT }}>📋 Instructions for Employee</h4>
                  <ol className="text-sm space-y-2 text-gray-300 list-decimal list-inside">
                    <li>Go to: <span className="font-mono text-blue-400">{window.location.origin}/employee-login</span></li>
                    <li>Enter your email: <span className="font-mono text-green-400">{selectedEmployee.employeesdetails?.email}</span></li>
                    <li>Enter the password provided by admin</li>
                    <li>You will be redirected to your dashboard</li>
                    <li>Bookmark the URL for quick access</li>
                  </ol>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 flex-wrap">
                <Button onClick={handleCopyCredentials}>
                  📋 Copy All Credentials
                </Button>
                <Button onClick={handleOpenURL}>
                  🔗 Open Login Page
                </Button>
                <GhostBtn onClick={() => setShowCredentialsModal(false)}>
                  Close
                </GhostBtn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesAccManager;
