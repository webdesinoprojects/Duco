import React, { useState, useEffect } from "react";
import { FaSearch, FaShoppingBag, FaBars, FaTimes } from "react-icons/fa";
import { RiAccountCircle2Fill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/image.png";
import ProductMegaMenu from "./ProductMegaMenuXX";
import MobileSidebar from "./MobileSidebar";
import axios from "axios";

const Navbar = ({ setIsOpenLog, user }) => {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const [menuItems, setMenuItems] = useState([{ name: "Home", link: "/" }]);
  const [menuItemss, setMenuItemss] = useState([{ name: "Home", link: "/" }]);

  const toKey = (s) => (s ?? "").toLowerCase();
  const [isclick, setIsClick] = useState("home");
  const [islineclick, setIslineClick] = useState("home");

  /* ---------------- FETCH PRODUCTS ONCE ---------------- */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(
          "https://duco-67o5.onrender.com/products/get"
        );
        setAllProducts(res.data || []);
      } catch (err) {
        console.error("Navbar product fetch failed", err);
      }
    };
    fetchProducts();
  }, []);

  /* ---------------- FETCH CATEGORIES ---------------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { getCategories } = await import("../Service/APIservice");
        const cats = await getCategories();

        if (Array.isArray(cats)) {
          const homeItem = { name: "Home", link: "/" };

          const desktopItems = cats.map((cat) => {
            const route = cat.category
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            return {
              name: cat.category,
              link: `/${route}`,
              hasMegaMenu: true,
              megaCategory: cat.category,
            };
          });

          setMenuItems([homeItem, ...desktopItems]);
          setMenuItemss([homeItem, ...desktopItems]);
        }
      } catch (err) {
        console.error("Navbar category fetch failed", err);
      }
    };
    fetchCategories();
  }, []);

  /* ---------------- LIVE SEARCH ---------------- */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const q = searchQuery.toLowerCase();

    const filtered = allProducts.filter((p) => {
      return (
        p.products_name?.toLowerCase().includes(q) ||
        p.Desciptions?.some((d) => d.toLowerCase().includes(q))
      );
    });

    setSearchResults(filtered.slice(0, 6));
    setShowSearchDropdown(true);
  }, [searchQuery, allProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSearchDropdown(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <>
      <nav className="w-full bg-[#0A0A0A] text-white font-semibold relative z-50">
        {/* DESKTOP */}
        <div className="hidden md:grid max-w-[1920px] mx-auto px-6 py-4 grid-cols-3 items-center">
          {/* LEFT */}
          <div className="flex gap-6 text-sm">
            {menuItems.map((item) => {
              const key = toKey(item.name);
              return (
                <div
                  key={item.link}
                  className="relative"
                  onMouseEnter={() => {
                    setIsClick(key);
                    setIslineClick(key);
                  }}
                  onMouseLeave={() => setIsClick("home")}
                >
                  <Link to={item.link}>{item.name}</Link>

                  {item.hasMegaMenu && isclick === key && (
                    <div className="absolute top-full left-0 z-50">
                      <ProductMegaMenu category={item.megaCategory} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CENTER LOGO */}
          <div className="flex justify-center">
            <Link to="/">
              <img src={logo} alt="DUCO" className="h-6" />
            </Link>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4 justify-end relative">
            {/* SEARCH */}
            <div className="relative w-64">
              <div className="flex items-center border-b gap-2">
                <FaSearch onClick={handleSearch} className="cursor-pointer" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="bg-transparent outline-none w-full"
                />
              </div>

              {/* LIVE DROPDOWN */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 w-full bg-black border border-gray-700 mt-1 rounded-md">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-gray-400">
                      No results
                    </div>
                  ) : (
                    searchResults.map((p) => (
                      <Link
                        key={p._id}
                        to={`/products/${p._id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="block px-3 py-2 hover:bg-gray-800 text-sm"
                      >
                        {p.products_name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* CART */}
            <FaShoppingBag
              onClick={() => navigate("/cart")}
              className="cursor-pointer"
            />

            {/* LOGIN / PROFILE */}
            {!user ? (
              <button onClick={() => setIsOpenLog(true)}>Login</button>
            ) : (
              <RiAccountCircle2Fill
                onClick={() => navigate("/profile")}
                className="text-2xl cursor-pointer"
              />
            )}
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden px-4 py-3 flex justify-between items-center">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <Link to="/">
            <img src={logo} alt="DUCO" className="h-5" />
          </Link>

          {/* MOBILE ICONS CONTAINER - Search, Profile, Cart */}
          <div className="flex items-center gap-4">
            {/* SEARCH ICON */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="text-lg cursor-pointer hover:opacity-80 transition"
            >
              🔍
            </button>

            {/* PROFILE ICON */}
            {!user ? (
              <button
                onClick={() => setIsOpenLog(true)}
                className="text-lg cursor-pointer hover:opacity-80 transition"
              >
                👤
              </button>
            ) : (
              <button
                onClick={() => navigate("/profile")}
                className="text-lg cursor-pointer hover:opacity-80 transition"
              >
                👤
              </button>
            )}

            {/* CART ICON */}
            <FaShoppingBag
              onClick={() => navigate("/cart")}
              className="cursor-pointer hover:opacity-80 transition"
            />
          </div>
        </div>

        {/* MOBILE SEARCH OVERLAY */}
        {isMobileSearchOpen && (
          <div className="md:hidden px-4 py-3 border-t border-gray-700">
            <div className="flex items-center gap-2 border-b pb-2">
              <FaSearch className="cursor-pointer" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent outline-none w-full text-white placeholder-gray-500"
                autoFocus
              />
            </div>

            {/* MOBILE SEARCH DROPDOWN RESULTS */}
            {showSearchDropdown && (
              <div className="mt-2 bg-black border border-gray-700 rounded-md max-h-64 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400">No results</div>
                ) : (
                  searchResults.map((p) => (
                    <Link
                      key={p._id}
                      to={`/products/${p._id}`}
                      onClick={() => {
                        setShowSearchDropdown(false);
                        setIsMobileSearchOpen(false);
                      }}
                      className="block px-3 py-2 hover:bg-gray-800 text-sm border-b border-gray-700 last:border-b-0"
                    >
                      {p.products_name}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {mobileMenuOpen && (
        <MobileSidebar
          menuItems={menuItemss}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      )}
    </>
  );
};

export default Navbar;
