import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { FaFilter } from "react-icons/fa";
import { usePriceContext } from "../ContextAPI/PriceContext";

// Currency symbols map
const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
};

const Products = ({ gender }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    toConvert,
    priceIncrease,
    currency,
    isLoading: priceLoading,
  } = usePriceContext();
  
  const currencySymbol = currencySymbols[currency] || "₹";

  // Filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [sortOption, setSortOption] = useState("");

  const location = useLocation();

  // ✅ FIXED: Price calculation function with correct formula
  const calculatePrice = (basePrice) => {
    if (!basePrice) return 0;
    
    // Default values if context not ready
    const markup = priceIncrease || 0;
    const rate = toConvert && toConvert > 0 ? toConvert : 1;
    
    // ✅ CORRECT FORMULA: (Base + Markup%) * Conversion Rate
    const withMarkup = basePrice + (basePrice * markup / 100);
    const finalPrice = Math.round(withMarkup * rate);
    
    return finalPrice;
  };

  // Normalize gender value
  const normalizeGender = (g) => g?.toLowerCase().trim();

  // Gender mapping
  const genderMap = {
    male: ["male", "men", "unisex"],
    female: ["female", "women", "woman", "girl", "girls", "unisex"],
    kids: ["kids", "kid", "boys", "boy", "girls", "girl"],
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("🛍️ Fetching products...");
        const res = await axios.get("https://duco-67o5.onrender.com/products/get");
        let allProducts = res.data || [];
        console.log("📦 Products fetched:", allProducts.length);

        // 🔹 Apply gender filtering
        if (gender) {
          const allowed = genderMap[gender.toLowerCase()] || [];
          allProducts = allProducts.filter((p) => {
            const g = normalizeGender(p.gender);
            if (!g) return !gender; // allow missing gender in "All"
            return allowed.includes(g);
          });
          console.log("🔍 After gender filtering:", allProducts.length);
        }

        setProducts(allProducts);
        console.log("✅ Products set in state:", allProducts.length);
      } catch (error) {
        console.error("❌ Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [gender, location.pathname]);

  // 🔹 Apply filters and sorting
  const filteredProducts = products
    .filter((p) => {
      // Category filter
      if (selectedCategories.length > 0) {
        const cat = p.category?.toLowerCase();
        if (!selectedCategories.some((c) => cat?.includes(c.toLowerCase())))
          return false;
      }

      // Size filter
      if (selectedSizes.length > 0) {
        const sizes = p.sizes?.map((s) => s.toUpperCase()) || [];
        if (!selectedSizes.some((s) => sizes.includes(s))) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOption === "lowToHigh") {
        return (
          (a.pricing?.[0]?.price_per || 0) - (b.pricing?.[0]?.price_per || 0)
        );
      } else if (sortOption === "highToLow") {
        return (
          (b.pricing?.[0]?.price_per || 0) - (a.pricing?.[0]?.price_per || 0)
        );
      }
      return 0; // Default: no sorting (or "popularity" later)
    });

  // Handle category filter
  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Handle size filter
  const handleSizeChange = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  if (loading) {
    return (
      <div className="text-white min-h-screen flex justify-center items-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="text-white min-h-screen p-4">
      {/* Heading */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:block hidden font-bold capitalize">
          {gender ? `${gender} Products` : "All Products"}
        </h1>
        <span className="text-gray-500">
          {filteredProducts.length} Products
        </span>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <aside className="md:block hidden w-1/5 space-y-6">
          {/* Gender */}
          <div>
            <h2 className="font-semibold mb-2">Gender</h2>
            <div className="space-y-1">
              <label className="block">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={gender?.toLowerCase() === "male"}
                  readOnly
                />
                Men
              </label>
              <label className="block">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={gender?.toLowerCase() === "female"}
                  readOnly
                />
                Women
              </label>
              <label className="block">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={gender?.toLowerCase() === "kids"}
                  readOnly
                />
                Kids
              </label>
            </div>
          </div>

          <hr className="border-t border-gray-100" />

          {/* Category */}
          <div>
            <h2 className="font-semibold mb-2">Category</h2>
            <div className="space-y-1">
              {["T-Shirt", "Vest", "Hoodies"].map((cat) => (
                <label key={cat} className="block">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryChange(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <hr className="border-t border-gray-100" />

          {/* Sizes */}
          <div>
            <h2 className="font-semibold mb-2">Sizes</h2>
            <div className="space-y-1">
              {["XS", "S", "M", "L", "XL"].map((size) => (
                <label key={size} className="block">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedSizes.includes(size)}
                    onChange={() => handleSizeChange(size)}
                  />
                  {size}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Products Section */}
        <div className="flex-1">
          {/* Bulk order banner */}
          <div className="bg-black text-white p-6 rounded-xl mb-6 relative">
            <h2 className="text-xl font-bold mb-2">
              Enquire about <span className="text-yellow-400">Bulk Orders</span>{" "}
              at
            </h2>
            <div className="bg-white text-black inline-block px-4 py-2 rounded text-sm font-mono">
              business@duco.com
            </div>
            <p className="text-sm mt-2">
              *Min. 30 units order | Grab exciting deals & offers
            </p>
          </div>

          {/* Sort bar */}
          <div className="flex justify-between mb-4">
            <FaFilter />
            <div>
              <label className="text-sm mr-2">Sort by:</label>
              <select
                className="border border-gray-300 rounded px-2 py-1 bg-black text-sm"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="">Popularity</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {filteredProducts.map((product, index) => {
              const imageUrl =
                product.image_url?.[0]?.url?.[0] ||
                "https://via.placeholder.com/400";

              return (
                <Link
                  to={`/products/${product._id}`}
                  key={product._id || index}
                  className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt={product.products_name || "Product"}
                      className="w-[200px] h-[200px] object-contain mx-auto"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold">
                      {product.products_name || "Unnamed Product"}
                    </h3>
                    <p className="text-sm font-bold mt-2">
                      {product.pricing?.[0]?.price_per
                        ? `${currencySymbol}${calculatePrice(product.pricing[0].price_per)}`
                        : `${currencySymbol}N/A`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
