import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiX, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import logo from "../assets/image.png";
import { getCategories, getSubcategoriesByCategoryId } from "../Service/APIservice";
import AccountQuickActions from "./AccountQuickActions"

const fallbackMap = {
  Men: "Men's Clothing",
  Women: "Women's Clothing",
  Kid: "Kid's Clothing",
  Kids: "Kid's Clothing",
  "Corporate T-Shirt": "Corporate T-Shirt",
  "Bulk Order": "Corporate T-Shirt",
};

const MobileSidebar = ({ menuItems, setMobileMenuOpen, mobileMenuOpen }) => {
  const [isClick, setIsClick] = useState("Home");
  const [allCategories, setAllCategories] = useState([]);
  const [openMegaFor, setOpenMegaFor] = useState(null);   // "Men" | "Women" | "Kids" | null
  const [activeCat, setActiveCat] = useState(null);       // full category object
  const [subcats, setSubcats] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const imageRef = useRef(null);
  const navigate = useNavigate();

  

  // Load all categories once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await getCategories();
        if (mounted && Array.isArray(cats)) setAllCategories(cats);
      } catch (e) {
        console.error("getCategories failed:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Helper to match menu label -> category object from API
  const matchCategory = (label) => {
    const incoming = (label || "").toLowerCase();
    const mapped = (fallbackMap[label] || "").toLowerCase();

    return (
      allCategories.find(c => c?.category?.toLowerCase().includes(incoming)) ||
      allCategories.find(c => c?.category?.toLowerCase() === mapped) ||
      null
    );
  };

  const handleItemTap = async (item) => {
    // Items with megaCategory trigger API subcategory fetch
    if (item.megaCategory) {
      const cat = matchCategory(item.megaCategory);
      setOpenMegaFor(item.megaCategory);
      setActiveCat(cat);
      setSubcats([]);
      if (!cat?._id) return;

      setLoadingSubs(true);
      try {
        const subs = await getSubcategoriesByCategoryId(cat._id);
        setSubcats(Array.isArray(subs) ? subs : []);
      } catch (e) {
        console.error("getSubcategoriesByCategoryId failed:", e);
        setSubcats([]);
      } finally {
        setLoadingSubs(false);
      }
      return;
    }

    // Normal links
    if (item.link) {
      setIsClick(item.name);
      setMobileMenuOpen(false);
      navigate(item.link);
    }
  };

  return (
    <>
      {/* Toggle Button */}
     

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* MAIN SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-full bg-black text-white z-50 transform transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-4 border-b border-white/20">
          <img ref={imageRef} src={logo} alt="Logo" className="h-8 w-auto" />
          <FiX onClick={() => setMobileMenuOpen(false)} className="text-2xl cursor-pointer" />
        </div>

        {/* Menu list */}
        <div className="flex flex-col gap-1 mt-4 px-4">
          {menuItems.map((item, idx) => (
            <div key={idx}>
              <button
                onClick={() => handleItemTap(item)}
                className="w-full flex items-center justify-between py-3 uppercase text-base tracking-wide"
              >
                <span className="relative">
                  {item.name}
                  {item._id === isClick && !item._id && (
                    <span className="absolute left-0 -bottom-1 block w-full h-[2px] bg-[#E5C870]" />
                  )}
                </span>
                {item.megaCategory ? <FiChevronRight className="text-xl" /> : null}
              </button>
              <div className="h-px bg-white/10" />
            </div>
          ))}
            <div className=" pt-3">
      <AccountQuickActions setMobileMenuOpen={setMobileMenuOpen} />
    </div>
        </div>

        {/* RIGHT-SIDE SHEET: shows API subcategories */}
        <div
          className={`fixed top-0 right-0 h-full w-full sm:w-[85%] bg-white z-50 transform transition-transform duration-300 ${
            openMegaFor ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Mega header */}
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <button
              onClick={() => setOpenMegaFor(null)}
              className="flex items-center gap-2 text-black"
            >
              <FiChevronLeft className="text-xl" /> Back
            </button>
            <FiX
              onClick={() => {
                setOpenMegaFor(null);
                setMobileMenuOpen(false);
              }}
              className="text-2xl text-black cursor-pointer"
            />
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0A0A0A]">
                  {activeCat?.category || fallbackMap[openMegaFor] || openMegaFor || "Products"}
                </h3>
                {activeCat?._id && (
                  <Link
                    to={`/category/${activeCat._id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-black hover:underline"
                  >
                    View All ›
                  </Link>
                )}
              </div>

              {loadingSubs ? (
                <div className="py-8 text-center text-gray-600">Loading…</div>
              ) : subcats.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {subcats.map((s) => (
                    <Link
                      key={s._id}
                      to={`/products/subcategory/${s._id}/${encodeURIComponent(s.subcatogry)}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="bg-[#E5C870] hover:shadow-md rounded-lg p-3 text-center transition-all"
                    >
                      <p className="text-sm font-medium text-black truncate">{s.subcatogry}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">No subcategories found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
