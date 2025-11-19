import React, { useState, useEffect, useContext } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { MdOutlinePrint, MdOutlineColorLens, MdOutlineStraighten } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPreviousDesigns, getproductssingle ,fetchPreviousDesignswithpreoduts} from '../Service/APIservice';
import DesignPreviewModal from '../Components/DesignPreview';
import { CartContext } from "../ContextAPI/CartContext";
import { usePriceContext } from '../ContextAPI/PriceContext';
import Zoom from 'react-medium-image-zoom';
import { toast } from "react-toastify";
import 'react-medium-image-zoom/dist/styles.css';
import { useOutletContext } from 'react-router-dom';
import PriceTiers from '../Components/PriceTiers';
import CropTanksTabs from '../Components/CropTanksTabs';
import CropTankSizeChart from '../Components/CropTankSizeChart';


function useLayoutCtx() {
  return useOutletContext(); // { setIsOpenLog, isLogin, setIsLogin, login, user }
}
const PRICE_TIERS = [
  { range: "1", price: 510 },
  { range: "2 - 4", price: 467 },
  { range: "5 - 10", price: 408, recommended: true },
  { range: "11 - 20", price: 380 },
  { range: "21 - 50", price: 371 },
];

const ProductPageBulk = () => {
    const { setIsOpenLog } = useLayoutCtx();
  const [selectedColorCode, setSelectedColorCode] = useState('');
  const [selectedSize, setSelectedSize] = useState('M');
  const[price,setPrice] = useState(0)
  const[print,setPrint] = useState("")

   const stored = localStorage.getItem('user');
    const user = JSON.parse(stored);
 const { toConvert, priceIncrease ,setLocation } = usePriceContext();
  const [showModal, setShowModal] = useState(false);
  const [colortext,setColortext] = useState(null)
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [product, setProduct] = useState();
  const [defaultColorGroup, setDefaultColorGroup] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const { addToCart } = useContext(CartContext);
  const { id } = useParams();
    const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
  const initialQty = SIZES.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
  const navigate = useNavigate();
  const [qty, setQty] = useState(initialQty);
  const[gender,setGender] = useState("")

  const[iscount,setIscount]= useState(0)
  const [minOrderQty, setMinOrderQty] = useState(100); // Minimum order quantity from admin settings


  // Load minimum order quantity from corporate settings
  useEffect(() => {
    const loadMinQty = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await fetch(`${API_BASE}/api/corporate-settings`);
        if (response.ok) {
          const result = await response.json();
          const settings = result.data || result;
          setMinOrderQty(settings.minOrderQuantity || 100);
          console.log('✅ Loaded minimum order quantity:', settings.minOrderQuantity);
        }
      } catch (error) {
        console.log('⚠️ Using default minimum order quantity (100)');
      }
    };
    loadMinQty();
  }, []);

  // Fetch product
  useEffect(() => {
    // Scroll to top when product changes
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    
    const fetchProduct = async () => {
      const data = await getproductssingle(id);
      if (data) {
        const p = Array.isArray(data) ? data[0] : data;
        setProduct(p);
        setDefaultColorGroup(p.image_url?.[0]);
        setSelectedColorCode(p.image_url?.[0]?.colorcode || '#ffffff');
        setColortext(p.image_url?.[0]?.color)
         setPrice(calculatePrice(toConvert,p?.pricing?.[0]?.price_per,priceIncrease))
         setGender(p.gender)

      }
      // Removed redirect - priceIncrease might not be loaded yet
    };
    fetchProduct();
  }, [id]);




  // ✨ Just works out of the box!



 

  // Load user designs when modal opens
  useEffect(() => {
    const loadDesigns = async () => {
     
      if (!stored) return;
      setLoadingDesigns(true);
     
      const data = await fetchPreviousDesignswithpreoduts(user._id,id);
      setDesigns(data || []);
      setLoadingDesigns(false);
     
    };
    loadDesigns();
  }, [id]);

  // Handle color change
  const handleColorChange = (colorcode,colortext) => {
    const matched = product?.image_url?.find((c) => c.colorcode === colorcode);
        console.log(colortext)
    if (matched) {
   
      setDefaultColorGroup(matched);
      setSelectedColorCode(colorcode);
      setColortext(colortext)
      setIscount(0)
    }
  }; 

  function calculatePrice(currency, ac, high) {
    const actualPrice = currency*ac
    return  actualPrice + (actualPrice * (high / 100));

}

const handleQty = (k, v) => {
  const n = Math.max(0, Math.min(9999, Number(v.replace(/[^0-9]/g, "")) || 0));
  setQty((p) => ({ ...p, [k]: n }));
};

// Calculate total quantity
const getTotalQty = () => {
  return Object.values(qty).reduce((sum, q) => sum + Number(q || 0), 0);
};

// Validate minimum quantity
const validateMinimumQuantity = () => {
  const totalQty = getTotalQty();
  if (totalQty < minOrderQty) {
    toast.error(`Minimum order quantity is ${minOrderQty} units. You have selected ${totalQty} units.`);
    return false;
  }
  return true;
};



  return (
    <section className="p-6 text-white ">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Left - Images */}
        <div className="h-auto">
          {/* <ImageMagnifier
      src=
      zoom={2.5}        // tweak as you like
      lensSize={160}    // tweak lens size
    /> */}
   <Zoom>
  <img className='bg-white w-full sm:h-[600px] max-w-[500px] md:max-w-full   object-contain shadow-md overflow-hidden   rounded-2xl' src={defaultColorGroup?.url?.[iscount] ?? ''} alt="Product" />
</Zoom>
 
  

          <div className="flex gap-2 mt-4">
            {defaultColorGroup?.url?.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={()=> setIscount(i)}
                alt="Thumbnail"
                className={`w-16 h-16 object-cover rounded-md  ${iscount == i ? "border-3 border-[#E5C870]  scale-1.5 ":""} `}
              />
            ))}
          </div>
        </div>
        

        {/* Right - Details */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-[#E5C870]">{product?.products_name}</h1>
          <p className="text-2xl font-semibold">₹{price}</p>

          <button
            onClick={() => navigate("/getbulk")}
            className="bg-[#E5C870] hover:bg-green-600 text-black font-bold px-4 py-2 rounded"
          >
            Get Your Free Bulk Quote
          </button>

          <ul className="grid grid-cols-2 gap-1 text-sm text-white">
            <li><FaCheckCircle className="inline mr-1 text-green-600" />180 GSM</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />100% Cotton</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />Super Combed</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />Pre Shrunk</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />Bio Washed</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />Lycra Ribbed Neck</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />Unisex Regular Fit</li>
            <li><FaCheckCircle className="inline mr-1 text-green-600" />No Minimums</li>
          </ul>

          {/* <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MdOutlinePrint /> Printing Options
            </h3>
            <div className="flex gap-4">
              {['DTG', 'DTF', 'Vinyl', ].map((opt) => (
                <button onClick={()=>setPrint(opt)} key={opt} className={`border px-4 py-1 rounded ${print == opt ? "bg-green-600":""} `} >{opt}</button>
              ))}
            </div>
          </div> */}

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MdOutlineColorLens /> Available Colors
            </h3>
            <div className="flex flex-wrap gap-2">
              {product?.image_url?.map((c, i) => (
                <button
                  key={i}
                  className={`w-8 h-8 rounded-full border ${selectedColorCode === c.colorcode ? 'ring-2 ring-green-600' : ''}`}
                  style={{ backgroundColor: c.colorcode }}

                  onClick={() => handleColorChange(c.colorcode,c.color)  }
                />
              
              ))}
            </div>
            
          </div>

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
  value={qty[s] === 0 ? "" : qty[s]}   // 👈 show empty if 0
  onChange={(e) => handleQty(s, e.target.value)}
  placeholder="0"
/>

    </label>
  ))}
</div>

            {/* Quantity Summary */}
            <div className={`mt-4 p-3 rounded-lg ${getTotalQty() >= minOrderQty ? 'bg-green-900/30 border border-green-600' : 'bg-yellow-900/30 border border-yellow-600'}`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">Total Quantity:</span>
                <span className={`font-bold ${getTotalQty() >= minOrderQty ? 'text-green-400' : 'text-yellow-400'}`}>
                  {getTotalQty()} / {minOrderQty} units
                </span>
              </div>
              {getTotalQty() < minOrderQty && (
                <p className="text-xs text-yellow-300 mt-2">
                  ⚠️ Minimum order quantity is {minOrderQty} units. Add {minOrderQty - getTotalQty()} more units to proceed.
                </p>
              )}
              {getTotalQty() >= minOrderQty && (
                <p className="text-xs text-green-300 mt-2">
                  ✅ Minimum quantity requirement met!
                </p>
              )}
            </div>

          </div>

          <button
            onClick={() =>{
              if(!user){
                  toast.error("Log In / Sign Up")
                  setIsOpenLog(true)
              }
              else if(!validateMinimumQuantity()){
                  // Validation error already shown by validateMinimumQuantity
                  return;
              }
              else{
                   setShowModal(true)
              }
            }
            }
            className="bg-[#E5C870] hover:bg-green-600 text-black w-full text-xl font-bold py-3 rounded"
          >
            Get BulkOrder
          </button>
            <div className="mt-6">
    <h3 className="text-lg font-semibold text-white mb-3">Your Previous Designs</h3>
    {loadingDesigns ? (
      <p className="text-sm text-gray-300">Loading...</p>
    ) : designs.length === 0 ? (
      <p className="text-sm text-gray-400">No previous designs found.</p>
    ) : (
     <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
  {designs.map((d) => (
    <div
      key={d._id}
      onClick={() => setSelectedDesign(d)}
      className="cursor-pointer group flex items-center gap-4 border border-gray-700 rounded-xl p-4 
                 bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-[1.02] 
                 hover:shadow-lg transition-all duration-300 ease-out"
    >
      {/* Optional Thumbnail */}
      {d.design?.[0]?.url && (
        <img
          src={d.design[0].url}
          alt="Design preview"
          className="w-12 h-12 object-contain rounded-md border border-gray-600 group-hover:border-[#E5C870] transition"
        />
      )}

      {/* Text Content */}
      <div className="flex flex-col flex-1">
        <p className="text-sm font-semibold text-white">
          Product ID:{" "}
          <span className="text-[#E5C870] font-mono">{d.products}</span>
        </p>
        <p className="text-xs text-gray-300">
          Created:{" "}
          <span className="text-gray-400">
            {new Date(d.createdAt).toLocaleDateString()}
          </span>
        </p>
      </div>

      {/* Icon */}
      <svg
        className="w-5 h-5 text-gray-400 group-hover:text-[#E5C870] transition"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  ))}
</div>

    )}
  </div>
        </div>
       

      </div>
       <PriceTiers tiers={PRICE_TIERS} currencySymbol="₹" />
        <CropTankSizeChart/>
       <CropTanksTabs/>
      


    


      

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
                design:[],
                color:selectedColorCode,
                quantity: qty,
                colortext,
                price: price,
                gender,
                isBulkProduct: true, // Flag to identify bulk order items
                isCorporate: product?.isCorporate !== false, // From database (default true for bulk pages)
                category: product?.category || 'Corporate T-Shirt', // Include category
                 })
                 setShowModal(false);
                 navigate("/cart")
                }}
                className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-gray-800 transition-all"
              >
                Regular T-Shirt
              </button>
              <button
                onClick={() => {
                 navigate(`/design/${id}/${selectedColorCode.replace('#', '')}`);

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
        price={price}
        minOrderQty={minOrderQty}
      />
    </section>
  );
};

export default ProductPageBulk;
