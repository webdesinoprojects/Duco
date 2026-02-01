import { useState, useEffect, useContext, useRef, useMemo } from "react";
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
  const [videoThumbnail, setVideoThumbnail] = useState(null);
  const videoRef = useRef(null);

  // ✅ Check if image is blank (data URL < 5KB)
  const isBlankImage = (src) => {
    if (!src) return true;
    if (typeof src !== 'string') return true;
    if (src.startsWith('data:') && src.length < 5000) return true;
    return false;
  };

  // ✅ Generate video thumbnail
  const generateVideoThumbnail = (videoUrl) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.currentTime = 1; // Get frame at 1 second
        
        video.onloadedmetadata = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
          } catch (err) {
            console.error('Error generating video thumbnail:', err);
            resolve(null);
          }
        };
        
        video.onerror = () => {
          console.error('Error loading video for thumbnail:', videoUrl);
          resolve(null);
        };
      } catch (err) {
        console.error('Error in generateVideoThumbnail:', err);
        resolve(null);
      }
    });
  };

  // ✅ Fetch product
  useEffect(() => {
    // Scroll to top when product changes
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    
    const fetchProduct = async () => {
      const data = await getproductssingle(id);
      if (data) {
        const p = Array.isArray(data) ? data[0] : data;
        console.log('📦 Product loaded:', p);
        console.log('🖼️ Image URL structure:', p.image_url);
        
        // ✅ Validate image_url structure
        if (!p.image_url || p.image_url.length === 0) {
          console.warn('⚠️ No images found for product');
        } else if (!p.image_url[0].url || p.image_url[0].url.length === 0) {
          console.warn('⚠️ First color group has no images');
        }
        
        setProduct(p);
        setDefaultColorGroup(p.image_url?.[0]);
        setSelectedColorCode(p.image_url?.[0]?.colorcode || "#ffffff");
        setColortext(p.image_url?.[0]?.color);
        setGender(p.gender);
        const basePrice = p?.pricing?.[0]?.price_per || 0;
        setPrice(basePrice);
        
        // Generate video thumbnail if video exists
        if (p.image_url?.[0]?.videolink) {
          console.log('🎥 Video link found:', p.image_url[0].videolink);
          generateVideoThumbnail(p.image_url[0].videolink).then(thumb => {
            setVideoThumbnail(thumb);
          });
        }
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

    console.log('💰 ProductPage Price Calculation:', {
      basePrice,
      toConvert,
      priceIncrease,
      currency,
      resolvedLocation,
      hasToConvert: toConvert != null,
      hasPriceIncrease: priceIncrease != null
    });

    // ✅ If conversion rate is not ready, use base price
    if (toConvert == null || priceIncrease == null) {
      console.log('⚠️ Conversion not ready, using base price:', basePrice);
      setPrice(Math.round(basePrice));
      return;
    }

    // ✅ Ensure conversion rate is valid (> 0)
    if (toConvert <= 0) {
      console.warn('⚠️ Invalid conversion rate:', toConvert, '- using base price');
      setPrice(Math.round(basePrice));
      return;
    }

    let increased = basePrice + basePrice * (priceIncrease / 100);
    // ✅ CRITICAL FIX: Multiply by conversion rate, NOT divide
    // Conversion rate represents: 1 INR = X target_currency
    // Example: 1 INR = 0.011 EUR, so 500 INR = 500 * 0.011 = 5.5 EUR ✅
    // NOT: 500 / 0.011 = 45,454 EUR ❌ WRONG
    let converted = increased * toConvert;
    
    console.log('✅ Price converted:', {
      basePrice,
      priceIncrease,
      afterMarkup: increased,
      toConvert,
      finalPrice: Math.round(converted),
      currency
    });
    
    setPrice(Math.round(converted));
  }, [product, toConvert, priceIncrease, currency]);

  // ✅ Default price tiers (used when product doesn't have multiple tiers)
  const DEFAULT_PRICE_TIERS = [
    { range: "1", price: 510 },
    { range: "2 - 4", price: 467 },
    { range: "5 - 10", price: 408, recommended: true },
    { range: "11 - 20", price: 380 },
    { range: "21 - 50", price: 371 },
  ];

  // ✅ Create dynamic price tiers from product pricing with currency conversion
  const priceTiers = useMemo(() => {
    // Get conversion values, default to 1 and 0 if not ready
    const rate = toConvert && toConvert > 0 ? toConvert : 1;
    const markup = priceIncrease || 0;
    
    // Use product pricing if it has multiple tiers, otherwise use defaults
    const baseTiers = (product?.pricing && product.pricing.length > 1) 
      ? product.pricing.map((tier, index) => ({
          range: String(tier.quantity || index + 1),
          price: Number(tier.price_per) || 0,
          recommended: index === Math.floor(product.pricing.length / 2)
        }))
      : DEFAULT_PRICE_TIERS;
    
    console.log('📊 Creating price tiers:', {
      source: (product?.pricing && product.pricing.length > 1) ? 'product' : 'default',
      tiersCount: baseTiers.length,
      toConvert: rate,
      priceIncrease: markup,
      currency
    });
    
    // Apply conversion to all tiers
    return baseTiers.map(tier => {
      const basePrice = tier.price;
      const withMarkup = basePrice + (basePrice * (markup / 100));
      const convertedPrice = Math.round(withMarkup * rate);
      
      return {
        ...tier,
        price: convertedPrice
      };
    });
  }, [product?.pricing, toConvert, priceIncrease, currency]);

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

  // Show skeleton loading while product is loading
  if (!product) {
    return (
      <section className="p-6 text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Left - Image Skeleton */}
          <div className="animate-pulse">
            <div className="bg-gray-800 w-full h-[600px] rounded-2xl mb-4"></div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-800 w-16 h-16 rounded-md"></div>
              ))}
            </div>
          </div>

          {/* Right - Details Skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-gray-800 rounded w-3/4"></div>
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-gray-800 rounded"></div>
              ))}
            </div>
            <div className="h-12 bg-gray-800 rounded"></div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-6 bg-gray-800 rounded"></div>
              ))}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-8 h-8 bg-gray-800 rounded-full"></div>
              ))}
            </div>
            <div className="h-14 bg-gray-800 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Left - Images & Video */}
        <div className="h-auto">
          {defaultColorGroup?.videolink && iscount === -1 ? (
            <div className="bg-white w-full sm:h-[600px] max-w-[500px] md:max-w-full shadow-md overflow-hidden rounded-2xl flex items-center justify-center">
              <video
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
                muted
                key={defaultColorGroup.videolink}
                onError={(e) => {
                  console.error('❌ Video failed to load:', defaultColorGroup.videolink);
                  setIscount(0);
                }}
              >
                <source src={defaultColorGroup.videolink} type="video/mp4" />
                <source src={defaultColorGroup.videolink} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <Zoom>
              <img
                className="bg-white w-full sm:h-[600px] max-w-[500px] md:max-w-full object-contain shadow-md overflow-hidden rounded-2xl"
                src={defaultColorGroup?.url?.[iscount] ?? ""}
                alt="Product"
                onError={(e) => {
                  console.error('❌ Image failed to load:', defaultColorGroup?.url?.[iscount]);
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f0f0f0' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23999' text-anchor='middle' dy='.3em'%3EImage not available%3C/text%3E%3C/svg%3E";
                }}
              />
            </Zoom>
          )}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {defaultColorGroup?.url?.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={() => setIscount(i)}
                alt="Thumbnail"
                className={`w-16 h-16 object-cover rounded-md flex-shrink-0 cursor-pointer ${
                  iscount === i ? "border-3 border-[#E5C870] scale-1.5" : ""
                }`}
                onError={(e) => {
                  console.error('❌ Thumbnail failed to load:', img);
                  e.target.style.display = 'none';
                }}
              />
            ))}
            {defaultColorGroup?.videolink && (
              <button
                onClick={() => setIscount(-1)}
                className={`w-16 h-16 rounded-md flex-shrink-0 cursor-pointer flex items-center justify-center text-2xl transition-all relative overflow-hidden ${
                  iscount === -1 ? "border-3 border-[#E5C870] scale-105" : "hover:opacity-80"
                }`}
                title="Play Video"
              >
                {videoThumbnail ? (
                  <>
                    <img src={videoThumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition">
                      <span className="text-white text-xl drop-shadow-lg">▶️</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                    <span className="text-white text-xl">▶️</span>
                  </div>
                )}
              </button>
            )}
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
                    type="text"
                    inputMode="numeric"
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
                    {/* ✅ Use previewImages.front for thumbnail, fallback to design[0].url */}
                    {(d.previewImages?.front || d.design?.[0]?.url) && (
                      <img
                        src={d.previewImages?.front || d.design[0].url}
                        alt="Design preview"
                        className="w-12 h-12 object-contain rounded-md border border-gray-600 group-hover:border-[#E5C870] transition"
                        onError={(e) => {
                          console.error('❌ Design thumbnail failed to load');
                          e.target.style.display = 'none';
                        }}
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

      <PriceTiers tiers={priceTiers} currencySymbol={currencySymbol} />
      <CropTankSizeChart type="mensRoundNeck" />
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
                    design: [],
                    color: selectedColorCode,
                    quantity: qty,
                    colortext,
                    price: Math.round(price),
                    gender,
                    isCorporate: product?.isCorporate || false, // From database
                    isBulkProduct: product?.isCorporate || false, // Flag for bulk items
                    category: product?.category || null, // Include category for validation
                  });
                  setShowModal(false);
                  navigate("/cart");
                }}
                className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-gray-800 transition-all"
              >
                Plain T-Shirt
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
