import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
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
  const [loading, setLoading] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
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
        let allProducts = res.data || [];

        if (gender) {
          const allowed = genderMap[gender.toLowerCase()] || [];
          allProducts = allProducts.filter((p) => {
            const g = normalizeGender(p.gender);
            if (!g) return false;
            return allowed.includes(g);
          });
        }

        setProducts(allProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [gender, location.pathname]);

  const filteredProducts = products.sort((a, b) => {
    if (sortOption === "lowToHigh") {
      return (
        (a.pricing?.[0]?.price_per || 0) -
        (b.pricing?.[0]?.price_per || 0)
      );
    }
    if (sortOption === "highToLow") {
      return (
        (b.pricing?.[0]?.price_per || 0) -
        (a.pricing?.[0]?.price_per || 0)
      );
    }
    return 0;
  });

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
          {gender ? `${gender} Products` : "All Products"}
        </h1>
        <span className="text-gray-500">
          {filteredProducts.length} Products
        </span>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
      </div>
    </div>
  );
};

export default Products;
