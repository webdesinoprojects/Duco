import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useParams } from "react-router-dom";
import { FaFilter } from "react-icons/fa";
import { usePriceContext } from "../ContextAPI/PriceContext";

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
};

const Products = ({ gender }) => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { id: subcategoryId, name: subcategoryName } = useParams();

  const [selectedGenders, setSelectedGenders] = useState([]);
  const [sortOption, setSortOption] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const location = useLocation();
  const { currency, toConvert, priceIncrease } = usePriceContext();
  const currencySymbol = currencySymbols[currency] || "₹";

  const calculatePrice = (basePrice) => {
    if (!basePrice) return 0;
    const markup = priceIncrease || 0;
    const rate = toConvert && toConvert > 0 ? toConvert : 1;
    return Math.round((basePrice + (basePrice * markup) / 100) * rate);
  };

  const normalizeGender = (g) => g?.toLowerCase().trim();

  const genderMap = {
    male: ["male", "men", "unisex"],
    female: ["female", "women", "woman", "girl", "girls", "unisex"],
    kids: ["kids", "kid", "boys", "boy", "girls", "girl"],
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    const fetchProducts = async () => {
      try {
        const res = await axios.get(
          "https://duco-67o5.onrender.com/products/get"
        );
        const fetchedProducts = res.data || [];
        setAllProducts(fetchedProducts);

        let filteredByRoute = fetchedProducts;

        // Filter by subcategory if subcategoryId exists
        if (subcategoryId) {
          filteredByRoute = filteredByRoute.filter((p) => p.subcategory === subcategoryId);
        }

        if (gender) {
          const allowed = genderMap[gender.toLowerCase()] || [];
          filteredByRoute = filteredByRoute.filter((p) => {
            const g = normalizeGender(p.gender);
            if (!g) return false;
            return allowed.includes(g);
          });
        }

        setProducts(filteredByRoute);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [gender, location.pathname, subcategoryId]);

  // Apply filters and sorting
  const filteredProducts = products
    .filter((product) => {
      // Gender filter
      if (selectedGenders.length > 0) {
        const productGender = normalizeGender(product.gender);
        const matchesGender = selectedGenders.some((selectedGender) => {
          // Map UI gender options to genderMap keys
          const genderKey = selectedGender === "Men" ? "male" : selectedGender === "Women" ? "female" : "kids";
          const allowed = genderMap[genderKey] || [];
          return allowed.includes(productGender);
        });
        if (!matchesGender) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOption === "lowToHigh") {
        return (
          (a.pricing?.[0]?.price_per || 0) - (b.pricing?.[0]?.price_per || 0)
        );
      }
      if (sortOption === "highToLow") {
        return (
          (b.pricing?.[0]?.price_per || 0) - (a.pricing?.[0]?.price_per || 0)
        );
      }
      return 0;
    });

  const genderOptions = ["Men", "Women", "Kids"];

  const toggleGender = (genderOption) => {
    setSelectedGenders((prev) =>
      prev.includes(genderOption)
        ? prev.filter((g) => g !== genderOption)
        : [...prev, genderOption]
    );
  };

  const clearFilters = () => {
    setSelectedGenders([]);
    setSortOption("");
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold capitalize hidden md:block">
          {subcategoryName
            ? decodeURIComponent(subcategoryName)
            : gender
            ? `${gender} Products`
            : "All Products"}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            {filteredProducts.length} Products
          </span>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden bg-[#E5C870] text-black px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaFilter /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop Filters Sidebar */}
        <div className="hidden md:block w-64 bg-[#1a1a1a] rounded-lg p-4 h-fit sticky top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            {(selectedGenders.length > 0 || sortOption) && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#E5C870] hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Sort by Price */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Sort by Price</h3>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              <option value="lowToHigh">Price: Low to High</option>
              <option value="highToLow">Price: High to Low</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Gender</h3>
            <div className="space-y-2">
              {genderOptions.map((genderOption) => (
                <label
                  key={genderOption}
                  className="flex items-center gap-2 cursor-pointer hover:text-[#E5C870]"
                >
                  <input
                    type="checkbox"
                    checked={selectedGenders.includes(genderOption)}
                    onChange={() => toggleGender(genderOption)}
                    className="w-4 h-4 rounded accent-[#E5C870]"
                  />
                  <span className="text-sm">{genderOption}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Filters Overlay */}
        {showMobileFilters && (
          <div className="fixed inset-0 bg-black/80 z-50 md:hidden">
            <div className="bg-[#1a1a1a] h-full w-full overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-2xl"
                >
                  ×
                </button>
              </div>

              {(selectedGenders.length > 0 || sortOption) && (
                <button
                  onClick={clearFilters}
                  className="w-full mb-4 text-sm text-[#E5C870] hover:underline"
                >
                  Clear All Filters
                </button>
              )}

              {/* Sort by Price */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Sort by Price</h3>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Default</option>
                  <option value="lowToHigh">Price: Low to High</option>
                  <option value="highToLow">Price: High to Low</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Gender</h3>
                <div className="space-y-2">
                  {genderOptions.map((genderOption) => (
                    <label
                      key={genderOption}
                      className="flex items-center gap-2 cursor-pointer hover:text-[#E5C870]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenders.includes(genderOption)}
                        onChange={() => toggleGender(genderOption)}
                        className="w-4 h-4 rounded accent-[#E5C870]"
                      />
                      <span className="text-sm">{genderOption}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-[#E5C870] text-black py-3 rounded-lg font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl mb-2">No products found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const imageUrl =
                  product.image_url?.[0]?.url?.[0] ||
                  "https://via.placeholder.com/400";

                return (
                  <Link
                    to={`/products/${product._id}`}
                    key={product._id}
                    className="border rounded-xl overflow-hidden hover:shadow-md transition"
                  >
                    <img
                      src={imageUrl}
                      alt={product.products_name}
                      className="w-[200px] h-[200px] object-contain mx-auto"
                    />

                    <div className="p-4">
                      <h3 className="text-sm font-semibold">
                        {product.products_name || "Unnamed Product"}
                      </h3>

                      {/* ✅ FIX: use correct backend field name */}
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {product.Desciptions?.[0] || "No description available"}
                      </p>

                      <p className="text-sm font-bold mt-2">
                        {product.pricing?.[0]?.price_per
                          ? `${currencySymbol}${calculatePrice(
                              product.pricing[0].price_per
                            ).toLocaleString("en-IN")}`
                          : `${currencySymbol}N/A`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
