import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getCategories, getSubcategoriesByCategoryId } from "../Service/APIservice";
import * as FaIcons from "react-icons/fa";
import Loading from "./Loading";

/**
 * ProductMegaMenuXX
 * Props:
 *  - category: string ("Men" | "Women" | "Kid" ... from Navbar)
 *
 * Behavior:
 *  - Fetch categories once, find the one that matches `category`
 *  - Fetch subcategories for that matched category
 *  - Render ONLY that category’s subcategories (no other categories in UI)
 */
const ProductMegaMenuXX = ({ category }) => {
  const [allCategories, setAllCategories] = useState([]);
  const [currentCat, setCurrentCat] = useState(null); // { _id, category, icons }
  const [subcats, setSubcats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback text if API not ready or no match
  const fallbackMap = {
    Men: "Men's Clothing",
    Women: "Women's Clothing",
    Kid: "Kid's Clothing",
    Kids: "Kid's Clothing",
  };

  const IconRenderer = ({ iconName, size = 22, color = "#0A0A0A" }) => {
    const IconComponent = FaIcons[iconName];
    return IconComponent ? <IconComponent size={size} color={color} /> : null;
  };

  // Normalize and match incoming `category` to API category name
  const matchCategory = useMemo(() => {
    const incoming = (category || "").toLowerCase();
    if (!incoming) return null;

    // Try exact-ish matches first
    const direct =
      allCategories.find(c =>
        c?.category?.toLowerCase().includes(incoming)
      ) ||
      // Try mapping (Men -> Men's Clothing, etc.)
      allCategories.find(c =>
        c?.category?.toLowerCase() === (fallbackMap[category] || "").toLowerCase()
      );

    return direct || null;
  }, [allCategories, category]);

  // Fetch all categories once
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const cats = await getCategories();
        if (mounted && Array.isArray(cats)) setAllCategories(cats);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When matchCategory changes, set it & fetch subcategories
  useEffect(() => {
    let mounted = true;
    const fetchSubs = async () => {
      if (!matchCategory?._id) {
        setSubcats([]);
        setCurrentCat(null);
        return;
      }
      setLoading(true);
      try {
        const subs = await getSubcategoriesByCategoryId(matchCategory._id);
        if (mounted) {
          setCurrentCat(matchCategory);
          setSubcats(Array.isArray(subs) ? subs : []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSubs();
    return () => { mounted = false; };
  }, [matchCategory]);

  // UI
  return (
    <div className="w-[800px] min-h-[350px] bg-white/95 backdrop-blur-md shadow-xl rounded-lg border border-gray-200 p-5 z-50">
      {/* Header row: Category title + icon + View All */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[#0A0A0A]">
            {currentCat?.category || fallbackMap[category] || category || "Products"}
          </h3>
          {!!currentCat?.icons && <IconRenderer iconName={currentCat.icons.trim()} />}
        </div>

        {/* Point "View All" to the category route if you have one.
            Adjust the path as per your routing (e.g., `/category/:id/:slug`). */}
        {currentCat?._id && (
          <Link
            to={`/category/${currentCat._id}`}
            className="text-sm font-medium text-black hover:underline"
          >
            View All ›
          </Link>
        )}
      </div>

      {/* Body: Only this category's subcategories */}
      {loading ? (
        <Loading />
      ) : subcats.length ? (
        <div className="grid grid-cols-3 gap-4  overflow-y-auto">
          {subcats.map((item) => (
            <Link
              key={item._id}
              to={`/products/subcategory/${item._id}/${encodeURIComponent(item.subcatogry)}`}
              className="bg-[#E5C870] hover:shadow-md rounded-lg p-3 text-center transition-all"
            >
              <p className="text-sm font-medium text-black truncate">
                {item.subcatogry}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-600">No subcategories found.</div>
      )}
    </div>
  );
};

export default ProductMegaMenuXX;
