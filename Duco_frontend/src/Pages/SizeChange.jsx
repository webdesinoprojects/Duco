import React, { useMemo, useState , useContext ,useEffect } from "react";
import { CartContext } from "../ContextAPI/CartContext";
import { useParams, useNavigate } from "react-router-dom";

// Polo Product Configurator UI (Pure JS version)
// Tech: React + TailwindCSS
// - Left: product view switcher (Front/Back/Left/Right)
// - Center: large shirt mock (placeholder SVG)
// - Right: Price chart + size & quantity inputs + Add to Cart

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];

const initialQty = SIZES.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});


const PRICE_TIERS = [
  { range: "1", price: 510 },
  { range: "2 - 4", price: 467 },
  { range: "5 - 10", price: 408, recommended: true },
  { range: "11 - 20", price: 380 },
  { range: "21 - 50", price: 371 },
];

const VIEWS = [
  { key: "Front", path: "M140 40 h220 a20 20 0 0 1 20 20 v320 a20 20 0 0 1-20 20 H140 a20 20 0 0 1-20-20 V60 a20 20 0 0 1 20-20 z" },
  { key: "Back", path: "M140 40 h220 a20 20 0 0 1 20 20 v320 a20 20 0 0 1-20 20 H140 a20 20 0 0 1-20-20 V60 a20 20 0 0 1 20-20 z" },
  { key: "Left", path: "M180 40 h40 v360 h-40 z" },
  { key: "Right", path: "M280 40 h40 v360 h-40 z" },
];

export default function SizeChange() {
     const { cart, clear, removeFromCart, updateQuantity } = useContext(CartContext);
     const [getProducts,setGetproducts] = useState();
     const navigator = useNavigate()
     const {id} = useParams()

     useEffect(() => {
       
        setGetproducts(cart.find((p) => p.id === id));


     }, [id])
     

 console.log(getProducts)
 console.log(cart)

  const [activeView, setActiveView] = useState("Front");
  const [qty, setQty] = useState(initialQty);

  const totalQty = useMemo(
    () => Object.values(qty).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    [qty]
  );

  const pricePerPiece = useMemo(() => {
    if (totalQty <= 0) return undefined;
    for (const t of PRICE_TIERS) {
      if (t.range.includes("-")) {
        const [lo, hi] = t.range.split("-").map((n) => parseInt(n.trim(), 10));
        if (totalQty >= lo && totalQty <= hi) return t.price;
      } else {
        const n = parseInt(t.range.trim(), 10);
        if (totalQty === n) return t.price;
        if (t.range.includes("21") && totalQty >= 21) return t.price; // last row 21-50+
      }
    }
    return PRICE_TIERS[PRICE_TIERS.length - 1].price;
  }, [totalQty]);

  const subtotal = useMemo(
    () => (pricePerPiece ? pricePerPiece * totalQty : 0),
    [pricePerPiece, totalQty]
  );

  const handleQty = (k, v) => {
    const n = Math.max(0, Math.min(9999, Number(v.replace(/[^0-9]/g, "")) || 0));
    setQty((p) => ({ ...p, [k]: n }));
  };

  const handleAddToCart = () => {
  if (!id) return;

  const pid = String(id);

  // qty here is already: { S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0 }
  updateQuantity(pid, qty);

  navigator("/cart");
};


  return (
    <div className="min-h-screen text-white bg-black">
      {/* Header */}
     

      {/* Main Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[120px_minmax(0,1fr)_480px] gap-6">
        {/* View Switcher */}
        <aside className="lg:sticky  text-slate-700 lg:top-20 self-start rounded-2xl bg-white border border-slate-200 p-3 flex lg:flex-col gap-3">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              className={[
                "group w-full flex flex-col items-center gap-1 rounded-xl p-2 border",
                activeView === v.key ? "border-sky-400 bg-sky-50" : "border-transparent hover:bg-slate-50",
              ].join(" ")}
            >
              {/* tiny silhouette */}
              <svg viewBox="0 0 400 440" className="h-16" aria-hidden>
                <path d={v.path} className={activeView === v.key ? "fill-sky-300" : "fill-slate-200"} />
              </svg>
              <span className={activeView === v.key ? "text-sky-600 text-sm font-medium" : "text-slate-600 text-sm"}>{v.key}</span>
            </button>
          ))}
        </aside>

        {/* Product Canvas */}
        <section className="relative rounded-2xl bg-white border border-slate-200 p-6 flex items-center justify-center min-h-[560px]">
          {/* simple polo svg */}
          {
            
            getProducts?.design ? 

            getProducts.design.map((p)=>{
                if(activeView === p.view){
                    <img src={p.url} className="w-[520px] max-w-full drop-shadow" alt={ p.view} />
                }
            })
            :
            <svg viewBox="0 0 540 680" className="w-[520px] max-w-full drop-shadow">
            <defs>
              <linearGradient id="polo" x1="0" x2="1">
                <stop offset="0%" stopColor="#6ee7e7" />
                <stop offset="100%" stopColor="#5bd5d5" />
              </linearGradient>
            </defs>
            <g>
              <path d="M95 130 L180 70 L230 120 L310 120 L360 70 L445 130 Q470 170 470 230 L470 560 Q470 620 410 640 L130 640 Q70 620 70 560 L70 230 Q70 170 95 130 Z" fill="url(#polo)" />
              <rect x="240" y="120" width="60" height="110" rx="6" fill="#48c7c7" />
              <circle cx="270" cy="180" r="3" fill="#ffffff" />
              <circle cx="270" cy="200" r="3" fill="#ffffff" />
              <circle cx="270" cy="220" r="3" fill="#ffffff" />
            </g>
          </svg>
          }
          
          <button className="absolute bottom-4 right-4 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm shadow-sm hover:shadow">Edit Design</button>
        </section>

        {/* Right Panel: Price + SizeQty */}
        <section className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6">
          {/* Price Chart */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold">Price Chart</h2>
              <span className="text-slate-400" title="Pricing varies by quantity">ⓘ</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Quantity Range</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Price Per Piece</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_TIERS.map((t, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50 text-black">
                      <td className="px-4 py-2">{t.range}</td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        ₹{t.price}
                        {t.recommended && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Recommended</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Size & Quantity */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold">Select Size and Quantity</h3>
                <p className="text-xs text-slate-500">Minimum Order Quantity: 1</p>
              </div>
              <a href="#" className="text-sm text-rose-600 hover:underline">Size Chart</a>
            </div>

            <div className="flex text-black flex-wrap gap-3 mt-2">
              {SIZES.map((s) => (
                <label key={s} className="flex flex-col items-center gap-1">
                  <span className="text-sm text-black">{s}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="h-12 w-16 rounded-xl border border-slate-300 text-center focus:outline-none focus:ring-2 focus:ring-sky-400"
                    value={qty[s]}
                    onChange={(e) => handleQty(s, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="text-sm text-slate-600">
                Total Quantity: <span className="font-semibold text-slate-900">{totalQty}</span>
              </div>
              <div className="text-sm text-slate-600">
                {pricePerPiece ? (
                  <>
                    Price/pc: <span className="font-semibold text-slate-900">₹{pricePerPiece}</span>
                  </>
                ) : (
                  "Set quantity to see price"
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Subtotal: <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString()}</span>
              </div>
              <button
                disabled={totalQty < 1}
                className={[
                  "flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold shadow-sm transition",
                  totalQty < 1 ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700 text-white",
                ].join(" ")}
                onClick={handleAddToCart}
              >
                <span>🛒</span> Add to Cart
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
