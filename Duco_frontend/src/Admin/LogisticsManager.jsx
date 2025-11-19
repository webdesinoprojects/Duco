// src/pages/LogisticsManager.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import {
  getOrders,
  createLogistic,
  updateLogistic,
  getLogisticsByOrder,
  getLogisticById,
} from "../Service/logisticsApi";
import ImageKitUpload from "../Components/ImageKitUpload";

const Field = ({ label, children, required }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-rose-600">*</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 ${props.className || ""}`}
  />
);

const Textarea = (props) => (
  <textarea
    rows={3}
    {...props}
    className={`w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 ${props.className || ""}`}
  />
);

const Button = ({ children, variant = "primary", ...props }) => {
  const base = "px-4 py-2 rounded-xl text-sm font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : variant === "secondary"
      ? "bg-green-600 text-white hover:bg-green-700"
      : variant === "warning"
      ? "bg-orange-600 text-white hover:bg-orange-700"
      : variant === "ghost"
      ? "bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300"
      : "bg-gray-200 text-gray-900";
  return (
    <button {...props} className={`${base} ${styles} ${props.className || ""}`}>
      {children}
    </button>
  );
};

const badgeByStatus = (s) => {
  switch ((s || "").toLowerCase()) {
    case "pending": return "bg-amber-100 text-amber-800";
    case "processing": return "bg-sky-100 text-sky-800";
    case "shipped": return "bg-purple-100 text-purple-800";
    case "delivered": return "bg-emerald-100 text-emerald-800";
    case "cancelled": return "bg-rose-100 text-rose-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

// ---------- Reusable searchable Order picker ----------
const isObjectId = (s = "") => /^[a-fA-F0-9]{24}$/.test(s.trim());

function OrderPicker({
  value,
  onChange,
  options = [],
  loading = false,
  placeholder = "Search order by ID / number / customer…",
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Keep the visible input in sync when parent value changes
  useEffect(() => {
    if (!open) setQuery(value || "");
  }, [value, open]);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options
      .filter(
        (o) =>
          String(o.id || "")
            .toLowerCase()
            .includes(q) ||
          String(o.label || "")
            .toLowerCase()
            .includes(q)
      )
      .slice(0, 20);
  }, [query, options]);

  const choose = (id) => {
    onChange?.(id);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isObjectId(query)) return choose(query.trim());
      if (filtered.length) return choose(filtered[0].id);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const selectedLabel =
    options.find((o) => o.id === value)?.label ||
    (value ? `${value}` : "");

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex gap-2">
        <Input
          disabled={disabled || loading}
          value={open ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={loading ? "Loading orders..." : placeholder}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => choose("")}
            title="Clear"
            className="shrink-0"
          >
            Clear
          </Button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {isObjectId(query) && !options.some((o) => o.id === query.trim()) && (
            <div
              className="cursor-pointer px-3 py-2 hover:bg-indigo-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(query.trim())}
            >
              Use typed id: <span className="font-mono">{query.trim()}</span>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="px-3 py-2 text-gray-500">No matches</div>
          )}

          {filtered.map((o) => (
            <div
              key={o.id}
              className={`cursor-pointer px-3 py-2 hover:bg-indigo-50 ${
                o.id === value ? "bg-indigo-50" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.id)}
              title={o.id}
            >
              <div className="font-mono text-xs text-gray-600">{o.id}</div>
              <div className="text-sm">{o.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ---------- End OrderPicker ----------

export default function LogisticsManager() {
  const [tab, setTab] = useState("create"); // create | update | browse
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // CREATE
  const [createForm, setCreateForm] = useState({
    orderId: "",
    trackingNumber: "",
    carrier: "",
    estimatedDelivery: "",
    shippingAddress: "",
    note: "",
    img: [{ URL: "" }],
    speedLogistics: false,
    labelGenerated: false,
  });

  // UPDATE
  const [lookupId, setLookupId] = useState("");
  const [updateForm, setUpdateForm] = useState({
    _id: "",
    orderId: "",
    trackingNumber: "",
    carrier: "",
    estimatedDelivery: "",
    shippingAddress: "",
    note: "",
    img: [{ URL: "" }],
    speedLogistics: false,
    labelGenerated: false,
  });
  const [loadingLookup, setLoadingLookup] = useState(false);

  // BROWSE
  const [selectedOrderForBrowse, setSelectedOrderForBrowse] = useState("");
  const [logisticsForOrder, setLogisticsForOrder] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  // Load orders
  useEffect(() => {
    (async () => {
      try {
        setOrdersLoading(true);
        console.log('📦 Fetching orders for logistics...');
        const data = await getOrders();
        console.log('📦 Orders received:', data);
        const ordersList = Array.isArray(data) ? data : (data?.orders ?? []);
        console.log('📦 Processed orders list:', ordersList.length, 'orders');
        setOrders(ordersList);
        if (ordersList.length === 0) {
          setToast({ type: "error", msg: "No orders found. Please create some orders first." });
        }
      } catch (e) {
        console.error('❌ Failed to load orders:', e);
        setToast({ type: "error", msg: `Failed to load orders: ${e.message}` });
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, []);

  const orderOptions = useMemo(
    () =>
      orders.map((o) => ({
        id: o._id,
        label:
          (o?.orderId || o._id) +
          (o?.address?.fullName ? ` — ${o.address.fullName}` : "") +
          (o?.status ? ` — ${o.status}` : ""),
      })),
    [orders]
  );

  // ------- helpers for img arrays -> [{URL}] -------
  const handleCreateImageRow = (idx, value) => {
    const next = [...createForm.img];
    next[idx] = { URL: value };
    setCreateForm((f) => ({ ...f, img: next }));
  };
  const addCreateImageRow = () =>
    setCreateForm((f) => ({ ...f, img: [...f.img, { URL: "" }] }));
  const removeCreateImageRow = (idx) =>
    setCreateForm((f) => ({ ...f, img: f.img.filter((_, i) => i !== idx) }));

  const handleUpdateImageRow = (idx, value) => {
    const next = [...updateForm.img];
    next[idx] = { URL: value };
    setUpdateForm((f) => ({ ...f, img: next }));
  };
  const addUpdateImageRow = () =>
    setUpdateForm((f) => ({ ...f, img: [...f.img, { URL: "" }] }));
  const removeUpdateImageRow = (idx) =>
    setUpdateForm((f) => ({ ...f, img: f.img.filter((_, i) => i !== idx) }));

  // ------- Create -------
  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        orderId: createForm.orderId,
        trackingNumber: createForm.trackingNumber || undefined,
        carrier: createForm.carrier || undefined,
        estimatedDelivery: createForm.estimatedDelivery || undefined,
        shippingAddress: createForm.shippingAddress,
        note: createForm.note || undefined,
        speedLogistics: Boolean(createForm.speedLogistics),
        labelGenerated: Boolean(createForm.labelGenerated),
        img:
          createForm.img?.filter((i) => i.URL?.trim())?.map(({ URL }) => ({ URL })) ??
          [],
      };
      if (!payload.orderId) throw new Error("Valid orderId is required.");
      if (!payload.shippingAddress) throw new Error("shippingAddress is required.");

      await createLogistic(payload);
      setToast({ type: "success", msg: "Logistic created successfully." });
      setCreateForm((f) => ({
        orderId: f.orderId,
        trackingNumber: "",
        carrier: "",
        estimatedDelivery: "",
        shippingAddress: "",
        note: "",
        speedLogistics: false,
        labelGenerated: false,
        img: [{ URL: "" }],
      }));
      if (tab === "browse" && selectedOrderForBrowse === payload.orderId) {
        await triggerBrowse();
      }
    } catch (e2) {
      if (e2?.status === 409) {
        setToast({ type: "error", msg: "trackingNumber already exists" });
      } else {
        setToast({ type: "error", msg: e2.message || "Create failed" });
      }
    }
  };

  // ------- Lookup then Update -------
  const lookupForUpdate = async () => {
    if (!lookupId.trim()) {
      setToast({ type: "error", msg: "Enter a logistic _id to fetch." });
      return;
    }
    try {
      setLoadingLookup(true);
      const doc = await getLogisticById(lookupId.trim());
      if (!doc?._id) throw new Error("Logistic not found.");

      const orderIdValue =
        doc?.orderId && typeof doc.orderId === "object" ? doc.orderId._id : doc?.orderId || "";

      setUpdateForm({
        _id: doc._id,
        orderId: orderIdValue,
        trackingNumber: doc.trackingNumber ?? "",
        carrier: doc.carrier ?? "",
        estimatedDelivery: doc.estimatedDelivery
          ? new Date(doc.estimatedDelivery).toISOString().slice(0, 10)
          : "",
        shippingAddress: doc.shippingAddress ?? "",
        note: doc.note ?? "",
        speedLogistics: Boolean(doc.speedLogistics),
        labelGenerated: Boolean(doc.labelGenerated),
        img: (doc.img && doc.img.length ? doc.img : [{ URL: "" }]).map((i) => ({
          URL: typeof i === "string" ? i : (i?.URL || ""),
        })),
      });
      setToast({ type: "success", msg: "Logistic loaded for update." });
    } catch (e) {
      setToast({ type: "error", msg: `Lookup failed: ${e.message}` });
    } finally {
      setLoadingLookup(false);
    }
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm._id) {
      setToast({ type: "error", msg: "Fetch a logistic first using its _id." });
      return;
    }
    try {
      const payload = {
        orderId: updateForm.orderId || undefined,
        trackingNumber: updateForm.trackingNumber || undefined,
        carrier: updateForm.carrier || undefined,
        estimatedDelivery: updateForm.estimatedDelivery || undefined,
        shippingAddress: updateForm.shippingAddress || undefined,
        note: updateForm.note || undefined,
        speedLogistics: Boolean(updateForm.speedLogistics),
        labelGenerated: Boolean(updateForm.labelGenerated),
        img:
          updateForm.img?.filter((i) => i.URL?.trim())?.map(({ URL }) => ({ URL })) ??
          [],
      };
      await updateLogistic(updateForm._id, payload);
      setToast({ type: "success", msg: "Logistic updated successfully." });

      if (
        tab === "browse" &&
        selectedOrderForBrowse &&
        (selectedOrderForBrowse === updateForm.orderId)
      ) {
        await triggerBrowse();
      }
    } catch (e2) {
      if (e2?.status === 409) {
        setToast({ type: "error", msg: "trackingNumber already exists" });
      } else {
        setToast({ type: "error", msg: e2.message || "Update failed" });
      }
    }
  };

  // ------- Browse -------
  const triggerBrowse = async () => {
    if (!selectedOrderForBrowse) {
      setToast({ type: "error", msg: "Select an order to browse." });
      return;
    }
    try {
      setBrowseLoading(true);
      const rows = await getLogisticsByOrder(selectedOrderForBrowse, { populate: true });
      setLogisticsForOrder(Array.isArray(rows) ? rows : (rows?.logistics ?? []));
    } catch (e) {
      setToast({ type: "error", msg: `Failed to fetch logistics: ${e.message}` });
      setLogisticsForOrder([]);
    } finally {
      setBrowseLoading(false);
    }
  };

  // ------- Label Generation -------
  const generateLabel = async (logisticId, format = 'pdf') => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/logistics/${logisticId}/label?format=${format}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to generate label');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shipping-label-${logisticId}.${format === 'pdf' ? 'txt' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToast({ type: "success", msg: `Label generated and downloaded` });
    } catch (error) {
      setToast({ type: "error", msg: `Failed to generate label: ${error.message}` });
    }
  };

  // ------- Speed Logistics Toggle -------
  const toggleSpeedLogistics = async (logisticId, currentStatus) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/logistics/${logisticId}/speed`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ speedLogistics: !currentStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update speed logistics');
      }

      setToast({ 
        type: "success", 
        msg: `Speed logistics ${!currentStatus ? 'enabled' : 'disabled'}` 
      });
      
      // Refresh the browse data if we're viewing logistics
      if (tab === "browse" && selectedOrderForBrowse) {
        await triggerBrowse();
      }
    } catch (error) {
      setToast({ type: "error", msg: `Failed to update speed logistics: ${error.message}` });
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold tracking-tight">Logistics Manager</h1>
      <p className="text-gray-600 mt-1">
        Create, update, and browse logistics linked to Orders.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        {["create", "update", "browse"].map((t) => (
          <Button
            key={t}
            variant={tab === t ? "primary" : "ghost"}
            onClick={() => setTab(t)}
          >
            {t === "create" ? "Create Logistic" : t === "update" ? "Update by _id" : "Browse by Order"}
          </Button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* CREATE TAB */}
      {tab === "create" && (
        <form onSubmit={submitCreate} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Order" required>
            <OrderPicker
              value={createForm.orderId}
              onChange={(id) => setCreateForm((f) => ({ ...f, orderId: id }))}
              options={orderOptions}
              loading={ordersLoading}
              placeholder="Paste orderId or search…"
            />
          </Field>

          <Field label="Tracking Number">
            <Input
              value={createForm.trackingNumber}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, trackingNumber: e.target.value }))
              }
              placeholder="e.g., AWB123456789"
            />
          </Field>

          <Field label="Carrier">
            <Input
              value={createForm.carrier}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, carrier: e.target.value }))
              }
              placeholder="e.g., Delhivery, Blue Dart"
            />
          </Field>

          <Field label="Estimated Delivery (Date)">
            <Input
              type="date"
              value={createForm.estimatedDelivery}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, estimatedDelivery: e.target.value }))
              }
            />
          </Field>

          <Field label="Shipping Address" required>
            <Textarea
              value={createForm.shippingAddress}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, shippingAddress: e.target.value }))
              }
              placeholder="Full address..."
            />
          </Field>

          <Field label="Note">
            <Textarea
              value={createForm.note}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, note: e.target.value }))
              }
              placeholder="Any special instructions..."
            />
          </Field>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Speed Logistics">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="speedLogistics"
                  checked={createForm.speedLogistics}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, speedLogistics: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="speedLogistics" className="text-sm text-gray-700">
                  Enable speed logistics for faster delivery
                </label>
              </div>
            </Field>

            <Field label="Label Status">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="labelGenerated"
                  checked={createForm.labelGenerated}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, labelGenerated: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="labelGenerated" className="text-sm text-gray-700">
                  Label already generated
                </label>
              </div>
            </Field>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Images (optional)</span>
              <Button type="button" variant="ghost" onClick={addCreateImageRow}>
                + Add Image URL
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {createForm.img.map((row, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={row.URL}
                      onChange={(e) => handleCreateImageRow(idx, e.target.value)}
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => removeCreateImageRow(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                  <ImageKitUpload
                    onUploadSuccess={(url) => handleCreateImageRow(idx, url)}
                    folder="logistics"
                    buttonText="📤 Upload Image"
                    buttonClassName="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    showPreview={false}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="w-full md:w-auto">
              Create Logistic
            </Button>
          </div>
        </form>
      )}

      {/* UPDATE TAB */}
      {tab === "update" && (
        <div className="mt-6 space-y-6">
          <div className="flex items-end gap-2">
            <Field label="Lookup Logistic by _id" required>
              <Input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Paste logistic _id"
              />
            </Field>
            <Button onClick={lookupForUpdate} disabled={loadingLookup}>
              {loadingLookup ? "Fetching..." : "Fetch"}
            </Button>
          </div>

          <form onSubmit={submitUpdate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Order">
              <OrderPicker
                value={updateForm.orderId}
                onChange={(id) => setUpdateForm((f) => ({ ...f, orderId: id }))}
                options={orderOptions}
                loading={ordersLoading}
                placeholder="Paste orderId or search…"
              />
            </Field>

            <Field label="Tracking Number">
              <Input
                value={updateForm.trackingNumber}
                onChange={(e) =>
                  setUpdateForm((f) => ({ ...f, trackingNumber: e.target.value }))
                }
              />
            </Field>

            <Field label="Carrier">
              <Input
                value={updateForm.carrier}
                onChange={(e) =>
                  setUpdateForm((f) => ({ ...f, carrier: e.target.value }))
                }
              />
            </Field>

            <Field label="Estimated Delivery (Date)">
              <Input
                type="date"
                value={updateForm.estimatedDelivery}
                onChange={(e) =>
                  setUpdateForm((f) => ({ ...f, estimatedDelivery: e.target.value }))
                }
              />
            </Field>

            <Field label="Shipping Address">
              <Textarea
                value={updateForm.shippingAddress}
                onChange={(e) =>
                  setUpdateForm((f) => ({ ...f, shippingAddress: e.target.value }))
                }
              />
            </Field>

            <Field label="Note">
              <Textarea
                value={updateForm.note}
                onChange={(e) => setUpdateForm((f) => ({ ...f, note: e.target.value }))}
              />
            </Field>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Speed Logistics">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateSpeedLogistics"
                    checked={updateForm.speedLogistics}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, speedLogistics: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="updateSpeedLogistics" className="text-sm text-gray-700">
                    Enable speed logistics for faster delivery
                  </label>
                </div>
              </Field>

              <Field label="Label Status">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateLabelGenerated"
                    checked={updateForm.labelGenerated}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, labelGenerated: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="updateLabelGenerated" className="text-sm text-gray-700">
                    Label already generated
                  </label>
                </div>
              </Field>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Images</span>
                <Button type="button" variant="ghost" onClick={addUpdateImageRow}>
                  + Add Image URL
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {updateForm.img.map((row, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={row.URL}
                        onChange={(e) => handleUpdateImageRow(idx, e.target.value)}
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => removeUpdateImageRow(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                    <ImageKitUpload
                      onUploadSuccess={(url) => handleUpdateImageRow(idx, url)}
                      folder="logistics"
                      buttonText="📤 Upload Image"
                      buttonClassName="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      showPreview={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full md:w-auto">
                Update Logistic
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* BROWSE TAB */}
      {tab === "browse" && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Select Order to View Logistics" required>
              <OrderPicker
                value={selectedOrderForBrowse}
                onChange={(id) => setSelectedOrderForBrowse(id)}
                options={orderOptions}
                loading={ordersLoading}
                placeholder="Paste orderId or search…"
              />
            </Field>
            <div className="flex items-end">
              <Button onClick={triggerBrowse} className="w-full md:w-auto">
                {browseLoading ? "Loading..." : "Fetch Logistics"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">_id</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Tracking #</th>
                  <th className="px-4 py-3 text-left">Carrier</th>
                  <th className="px-4 py-3 text-left">Est. Delivery</th>
                  <th className="px-4 py-3 text-left">Speed/Label</th>
                  <th className="px-4 py-3 text-left">Shipping Address</th>
                  <th className="px-4 py-3 text-left">Note</th>
                  <th className="px-4 py-3 text-left">Images</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {logisticsForOrder.length === 0 && !browseLoading && (
                  <tr>
                    <td colSpan="11" className="px-4 py-6 text-center text-gray-500">
                      {selectedOrderForBrowse ? "No logistics for this order yet." : "Select an order and click Fetch Logistics."}
                    </td>
                  </tr>
                )}
                {logisticsForOrder.map((l) => {
                  const orderObj = typeof l.orderId === "object" ? l.orderId : null;
                  const orderBadge = orderObj?.status ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeByStatus(orderObj.status)}`}>
                      {orderObj.status}
                    </span>
                  ) : null;

                  return (
                    <tr key={l._id} className="border-t align-top">
                      <td className="px-4 py-3 font-mono">{l._id}</td>
                      <td className="px-4 py-3">
                        {orderObj ? (
                          <div className="space-y-1">
                            <div className="font-mono text-xs">{orderObj._id}</div>
                            <div className="flex items-center gap-2">
                              {orderBadge}
                              {typeof orderObj.total !== "undefined" && (
                                <span className="text-xs text-gray-600">₹{Number(orderObj.total).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono text-xs">{l.orderId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{l.trackingNumber || "-"}</td>
                      <td className="px-4 py-3">{l.carrier || "-"}</td>
                      <td className="px-4 py-3">
                        {l.estimatedDelivery
                          ? new Date(l.estimatedDelivery).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              l.speedLogistics 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {l.speedLogistics ? "⚡ Speed" : "📦 Normal"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              l.labelGenerated 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {l.labelGenerated ? "🏷️ Generated" : "⏳ Pending"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="line-clamp-3" title={l.shippingAddress || ""}>
                          {l.shippingAddress || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="line-clamp-3" title={l.note || ""}>
                          {l.note || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[280px] flex-wrap gap-2">
                          {(l.img || []).map((im, i) => {
                            const src = typeof im === "string" ? im : im?.URL;
                            if (!src) return null;
                            return (
                              <a
                                className="block"
                                key={i}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                title={src}
                              >
                                <img
                                  src={src}
                                  alt=""
                                  className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200"
                                  onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                              </a>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1">
                            <Button
                              variant="secondary"
                              className="text-xs px-2 py-1"
                              onClick={() => generateLabel(l._id, 'pdf')}
                              title="Generate PDF Label"
                            >
                              📄 PDF
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-xs px-2 py-1"
                              onClick={() => generateLabel(l._id, 'jpg')}
                              title="Generate JPG Label"
                            >
                              🖼️ JPG
                            </Button>
                          </div>
                          <Button
                            variant={l.speedLogistics ? "warning" : "secondary"}
                            className="text-xs px-2 py-1"
                            onClick={() => toggleSpeedLogistics(l._id, l.speedLogistics)}
                            title={l.speedLogistics ? "Disable Speed Logistics" : "Enable Speed Logistics"}
                          >
                            {l.speedLogistics ? "⚡ Disable" : "🚀 Enable"}
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick “Fetch one by _id” helper */}
          <div className="rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold">Quick Lookup (GET /logisticid/:id)</h3>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Paste logistic _id to preview"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
              />
              <Button onClick={lookupForUpdate} disabled={loadingLookup}>
                {loadingLookup ? "Fetching..." : "Fetch & Load Into Update Tab"}
              </Button>
            </div>
            {updateForm?._id && (
              <p className="mt-2 text-sm text-gray-600">
                Loaded <span className="font-mono">{updateForm._id}</span> into the Update form.
                Switch to the <strong>Update</strong> tab to edit and save.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
