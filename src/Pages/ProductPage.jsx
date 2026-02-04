import { useState, useEffect, useContext } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { MdOutlineColorLens, MdOutlineStraighten } from "react-icons/md";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import {
  fetchPreviousDesignswithpreoduts,
  getproductssingle,
} from "../Service/APIservice";
import DesignPreviewModal from "../Components/DesignPreview";
import { CartContext } from "../ContextAPI/CartContext";
import { usePriceContext } from "../ContextAPI/PriceContext";
import Zoom from "react-medium-image-zoom";
import { toast } from "react-toastify";
import "react-medium-image-zoom/dist/styles.css";
import PriceTiers from "../Components/PriceTiers";
import CropTanksTabs from "../Components/CropTanksTabs";
import CropTankSizeChart from "../Components/CropTankSizeChart";

function useLayoutCtx() {
  return useOutletContext();
}

// ✅ Currency symbols map
const currencySymbols = {
  INR: "₹",
  USD: "$",
  AED: "د.إ",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  NZD: "NZ$",
  CHF: "CHF",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  MYR: "RM",
  THB: "฿",
  SAR: "﷼",
  QAR: "ر.ق",
  KWD: "KD",
  BHD: "BD",
  OMR: "﷼",
  ZAR: "R",
  PKR: "₨",
  LKR: "Rs",
  BDT: "৳",
  NPR: "रू",
  PHP: "₱",
  IDR: "Rp",
  KRW: "₩",
};

const PRICE_TIERS = [
  { range: "1", price: 510 },
  { range: "2 - 4", price: 467 },
  { range: "5 - 10", price: 408, recommended: true },
  { range: "11 - 20", price: 380 },
  { range: "21 - 50", price: 371 },
];

const ProductPage = () => {
  const { setIsOpenLog } = useLayoutCtx();
  const [selectedColorCode, setSelectedColorCode] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [price, setPrice] = useState(0);
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;
  const { toConvert, priceIncrease, currency, resolvedLocation } =
    usePriceContext();
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [showModal, setShowModal] = useState(false);
  const [colortext, setColortext] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [product, setProduct] = useState(null);
  const [defaultColorGroup, setDefaultColorGroup] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const { addToCart } = useContext(CartContext);
  const { id } = useParams();
  const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
  const initialQty = SIZES.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
  const navigate = useNavigate();
  const [qty, setQty] = useState(initialQty);
  const [gender, setGender] = useState("");
  const [iscount, setIscount] = useState(0);

  // ✅ Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      const data = await getproductssingle(id);
      if (data) {
        const p = Array.isArray(data) ? data[0] : data;
        setProduct(p);
        setDefaultColorGroup(p.image_url?.[0]);
        setSelectedColorCode(p.image_url?.[0]?.colorcode || "#ffffff");
        setColortext(p.image_url?.[0]?.color);
        setGender(p.gender);
        const basePrice = p?.pricing?.[0]?.price_per || 0;
        setPrice(basePrice);
      }
    };
    fetchProduct();
  }, [id]);

  // ✅ Update symbol when currency changes
  useEffect(() => {
    if (currency) {
      setCurrencySymbol(currencySymbols[currency] || "₹");
    }
  }, [currency]);

  // ✅ Recalculate price when location-based context is ready
  useEffect(() => {
    if (!product) return;
    const basePrice = product?.pricing?.[0]?.price_per || 0;

    if (toConvert == null || priceIncrease == null) {
      setPrice(Math.round(basePrice));
      return;
    }

    let increased = basePrice + basePrice * (priceIncrease / 100);
    let converted = increased * toConvert;
    setPrice(Math.round(converted));
  }, [product, toConvert, priceIncrease]);

  // ✅ Load previous designs
  useEffect(() => {
    const loadDesigns = async () => {
      if (!user) return;
      setLoadingDesigns(true);
      const data = await fetchPreviousDesignswithpreoduts(user._id, id);
      setDesigns(data || []);
      setLoadingDesigns(false);
    };
    loadDesigns();
  }, [id]);

  const handleColorChange = (colorcode, colortext) => {
    const matched = product?.image_url?.find((c) => c.colorcode === colorcode);
    if (matched) {
      setDefaultColorGroup(matched);
      setSelectedColorCode(colorcode);
      setColortext(colortext);
      setIscount(0);
    }
  };

  const handleQty = (k, v) => {
    const n = Math.max(
      0,
      Math.min(9999, Number(v.replace(/[^0-9]/g, "")) || 0)
    );
    setQty((p) => ({ ...p, [k]: n }));
  };

  return (
    <section className="p-6 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Left - Images */}
        <div className="h-auto">
          <Zoom>
            <img
              className="bg-white w-full sm:h-[600px] max-w-[500px] md:max-w-full object-contain shadow-md overflow-hidden rounded-2xl"
              src={defaultColorGroup?.url?.[iscount] ?? ""}
              alt="Product"
            />
          </Zoom>
          <div className="flex gap-2 mt-4">
            {defaultColorGroup?.url?.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={() => setIscount(i)}
                alt="Thumbnail"
                className={`w-16 h-16 object-cover rounded-md ${
                  iscount === i ? "border-3 border-[#E5C870] scale-1.5" : ""
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right - Details */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-[#E5C870]">
            {product?.products_name}
          </h1>

          <p className="text-2xl font-semibold">
            {currencySymbol}
            {price}
            {resolvedLocation && (
              <span className="text-sm text-gray-400 ml-2">
                ({resolvedLocation})
              </span>
            )}
          </p>

          {/* Features */}
          <ul className="grid grid-cols-2 gap-1 text-sm text-white">
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              180 GSM
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              100% Cotton
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              Super Combed
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              Pre Shrunk
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              Bio Washed
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              Lycra Ribbed Neck
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              Unisex Regular Fit
            </li>
            <li>
              <FaCheckCircle className="inline mr-1 text-green-600" />
              No Minimums
            </li>
          </ul>

          {/* Colors */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MdOutlineColorLens /> Available Colors
            </h3>
            <div className="flex flex-wrap gap-2">
              {product?.image_url?.map((c, i) => (
                <button
                  key={i}
                  className={`w-8 h-8 rounded-full border ${
                    selectedColorCode === c.colorcode
                      ? "ring-2 ring-green-600"
                      : ""
                  }`}
                  style={{ backgroundColor: c.colorcode }}
                  onClick={() => handleColorChange(c.colorcode, c.color)}
                />
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MdOutlineStraighten /> Available Sizes
            </h3>
            <div className="flex text-white flex-wrap gap-3 mt-2">
              {SIZES.map((s) => (
                <label key={s} className="flex flex-col items-center gap-1">
                  <span className="text-sm text-white">{s}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="h-12 w-16 rounded-xl border border-slate-300 text-center focus:outline-none focus:ring-2 focus:ring-sky-400"
                    value={qty[s] === 0 ? "" : qty[s]}
                    onChange={(e) => handleQty(s, e.target.value)}
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Buy Now */}
          <button
            onClick={() => {
              if (!user) {
                toast.error("Log In / Sign Up");
                setIsOpenLog(true);
                return;
              }
              const allZero = Object.values(qty).every((value) => value <= 0);
              if (allZero) {
                toast.error("Please select at least one size");
                return;
              }
              setShowModal(true);
            }}
            className="bg-[#E5C870] hover:bg-green-600 text-black w-full text-xl font-bold py-3 rounded"
          >
            Buy Now
          </button>

          {/* Previous Designs */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Your Previous Designs
            </h3>
            {loadingDesigns ? (
              <p className="text-sm text-gray-300">Loading...</p>
            ) : designs.length === 0 ? (
              <p className="text-sm text-gray-400">
                No previous designs found.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                {designs.map((d) => (
                  <div
                    key={d._id}
                    onClick={() => setSelectedDesign(d)}
                    className="cursor-pointer group flex items-center gap-4 border border-gray-700 rounded-xl p-4 bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ease-out"
                  >
                    {d.design?.[0]?.url && (
                      <img
                        src={d.design[0].url}
                        alt="Design preview"
                        className="w-12 h-12 object-contain rounded-md border border-gray-600 group-hover:border-[#E5C870] transition"
                      />
                    )}
                    <div className="flex flex-col flex-1">
                      <p className="text-sm font-semibold text-white">
                        Product ID:{" "}
                        <span className="text-[#E5C870] font-mono">
                          {d.products}
                        </span>
                      </p>
                      <p className="text-xs text-gray-300">
                        Created:{" "}
                        <span className="text-gray-400">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-[#E5C870] transition"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PriceTiers tiers={PRICE_TIERS} currencySymbol={currencySymbol} />
      <CropTankSizeChart />
      <CropTanksTabs />

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-md mx-auto text-center">
            <h2 className="text-xl font-bold mb-4">Choose T-Shirt Type</h2>
            <div className="space-y-4 mb-6">
              <button
                onClick={() => {
                  addToCart({
                    id,
                    design: {
                      front: {},
                      back: {},
                      left: {},
                      right: {}
                    },
                    color: selectedColorCode,
                    quantity: qty,
                    colortext,
                    price: Math.round(price),
                    gender,
                    isPlainTshirt: true, // ✅ Mark as plain t-shirt for easy identification
                  });
                  setShowModal(false);
                  navigate("/cart");
                }}
                className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-gray-800 transition-all"
              >
                Regular T-Shirt
              </button>
              <button
                onClick={() => {
                  navigate(
                    `/design/${id}/${selectedColorCode.replace("#", "")}`,
                    {
                      state: { quantity: qty },
                    }
                  );
                  setShowModal(false);
                }}
                className="w-full bg-[#E5C870] text-black py-2 rounded-md hover:bg-green-600 transition-all"
              >
                Design T-Shirt
              </button>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <DesignPreviewModal
        selectedDesign={selectedDesign}
        onClose={() => setSelectedDesign(null)}
        id={id}
        addtocart={addToCart}
        size={qty}
        color={selectedColorCode}
        colortext={colortext}
        gender={gender}
        price={Math.round(price)}
      />
    </section>
  );
};

export default ProductPage;
