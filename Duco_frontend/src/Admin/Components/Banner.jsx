// components/Banner.jsx
import { useEffect, useState } from "react";
import { listBanners, createBanner, updateBanner, deleteBanner } from "../../Service/APIservice";
import { useLocation } from "react-router-dom";
import ImageKitUpload from "../../Components/ImageKitUpload";

export default function Banner() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [heroText, setHeroText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const res = await listBanners();
      if (res.success) setItems(res.data || []);
      else setError(res.error || "Failed to load banners");
    })();
  }, []);

  const handleAdd = async () => {
    setError("");
    const val = text.trim();
    if (!val) return setError("Please paste an image URL.");
    try { new URL(val); } catch { return setError("Invalid URL."); }
    
    const res = await createBanner(val, heroText || "Color Of Summer Outfit", buttonText || "Shop the Look →", buttonLink || "/women");
    if (res.success) { 
      setItems((prev) => [res.data, ...prev]); 
      setText("");
      setHeroText("");
      setButtonText("");
      setButtonLink("");
    }
    else setError(res.error || "Failed to add banner");
  };

  const startEdit = (id, current) => setEditing((e) => ({ ...e, [id]: current }));
  const cancelEdit = (id) => setEditing((e) => { const copy = { ...e }; delete copy[id]; return copy; });

  const saveEdit = async (id, banner) => {
    setError("");
    const newVal = (editing[id]?.link || banner.link || "").trim();
    if (!newVal) return setError("URL cannot be empty.");
    try { new URL(newVal); } catch { return setError("Invalid URL."); }
    
    const res = await updateBanner(id, newVal, editing[id]?.heroText || banner.heroText, editing[id]?.buttonText || banner.buttonText, editing[id]?.buttonLink || banner.buttonLink);
    if (res.success) { 
      setItems((prev) => prev.map((b) => (b._id === id ? res.data : b))); 
      cancelEdit(id);
      setExpandedId(null);
    }
    else setError(res.error || "Failed to update banner");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    setError("");
    const res = await deleteBanner(id);
    if (res.success) { setItems((prev) => prev.filter((b) => b._id !== id)); }
    else setError(res.error || "Failed to delete banner");
  };

  function proxyUrlIfNeeded(url) {
    try {
      const u = new URL(url);
      const hostless = `${u.hostname}${u.pathname}${u.search || ""}`;
      return `https://images.weserv.nl/?url=${encodeURIComponent(hostless)}`;
    } catch {
      return url;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-[92%] max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Banner Images</h1>
            <p className="text-sm text-slate-500">Create, preview, and update banner image URLs with hero text and button.</p>
          </div>
        </div>

        {/* Input row (Create) */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste image URL (https://...)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                onClick={handleAdd}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 active:scale-[.98]"
              >
                Add URL
              </button>
            </div>

            {/* Hero Text and Button Fields */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-sm text-slate-600 font-medium">Hero Section Text & Button (Optional):</p>
              <input
                value={heroText}
                onChange={(e) => setHeroText(e.target.value)}
                placeholder="Hero text (e.g., Color Of Summer Outfit)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Button text (e.g., Shop the Look →)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
                />
                <input
                  value={buttonLink}
                  onChange={(e) => setButtonLink(e.target.value)}
                  placeholder="Button link (e.g., /women)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-slate-600 mb-2">Or upload image directly:</p>
              <ImageKitUpload
                onUploadSuccess={(uploadedUrl) => {
                  setText(uploadedUrl);
                }}
                folder="banners"
                buttonText="📤 Upload Banner Image"
                buttonClassName="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 active:scale-[.98]"
                showPreview={true}
              />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No banners yet. Paste a URL above and click <span className="font-medium text-slate-700">Add</span>.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ _id, link, heroText: bHeroText, buttonText: bButtonText, buttonLink: bButtonLink }) => {
              const isEditing = editing[_id] !== undefined;
              const displayLink = isEditing ? editing[_id]?.link : link;
              const displayHeroText = isEditing ? editing[_id]?.heroText : bHeroText;
              const displayButtonText = isEditing ? editing[_id]?.buttonText : bButtonText;
              const displayButtonLink = isEditing ? editing[_id]?.buttonLink : bButtonLink;
              const isExpanded = expandedId === _id;

              return (
                <li key={_id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <img
                      src={displayLink}
                      alt={`banner-${_id}`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (!el.dataset.fallbackTried) {
                          el.dataset.fallbackTried = "1";
                          el.src = proxyUrlIfNeeded(displayLink);
                          return;
                        }
                        el.src =
                          "data:image/svg+xml;utf8," +
                          encodeURIComponent(
                            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'><rect width='200' height='150' fill='#e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-size='14'>Preview failed</text></svg>"
                          );
                      }}
                    />
                    {!isEditing && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700 shadow hover:bg-white"
                      >
                        Open
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-3">
                    {isEditing ? (
                      <>
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                          value={editing[_id]?.link || link}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [_id]: { ...prev[_id], link: e.target.value } }))}
                          placeholder="https://new-url..."
                        />
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                          value={editing[_id]?.heroText || bHeroText}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [_id]: { ...prev[_id], heroText: e.target.value } }))}
                          placeholder="Hero text..."
                        />
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                          value={editing[_id]?.buttonText || bButtonText}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [_id]: { ...prev[_id], buttonText: e.target.value } }))}
                          placeholder="Button text..."
                        />
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                          value={editing[_id]?.buttonLink || bButtonLink}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [_id]: { ...prev[_id], buttonLink: e.target.value } }))}
                          placeholder="Button link..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(_id, { link, heroText: bHeroText, buttonText: bButtonText, buttonLink: bButtonLink })}
                            className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => cancelEdit(_id)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="line-clamp-2 text-xs text-slate-600">{link}</p>
                        {displayHeroText && <p className="text-xs text-slate-500">📝 {displayHeroText}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              startEdit(_id, { link, heroText: bHeroText, buttonText: bButtonText, buttonLink: bButtonLink });
                              setExpandedId(_id);
                            }}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(_id)}
                            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
