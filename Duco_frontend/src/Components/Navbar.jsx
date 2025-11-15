import React,{useState, useEffect} from 'react'
import { FaSearch, FaShoppingBag, FaBars, FaTimes   } from "react-icons/fa";
import { RiAccountCircle2Fill } from "react-icons/ri";
import logo from "../assets/image.png"

import { NavLink, useLocation ,Link , useNavigate } from "react-router-dom";
import ProductMegaMenu from './ProductMegaMenuXX';
import MobileSidebar from './MobileSidebar';
const Navbar = ({setIsOpenLog ,user}) => {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [mobileMegaOpen, setMobileMegaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([{ name: "Home", link: "/" ,isbold:false}]);
  const [menuItemss, setMenuItemss] = useState([{ name: "Home", link: "/" }]);

  // helper to normalize to lowercase safely
const toKey = (s) => (s ?? "").toLowerCase();

// state (start lowercase if you want a default)
const [isclick, setIsClick] = useState("home");
const [islineclick, setIslineClick] = useState("home");

// Fetch categories dynamically from API and build menu
useEffect(() => {
  const fetchCategories = async () => {
    try {
      const { getCategories } = await import('../Service/APIservice');
      const cats = await getCategories();
      if (Array.isArray(cats) && cats.length > 0) {
        console.log('📁 Navbar: Fetched categories:', cats);
        setDynamicCategories(cats);
        
        // Build dynamic menu items from categories
        const homeItem = { name: "Home", link: "/" ,isbold:false};
        const dynamicDesktopItems = cats
          .filter(cat => cat.category && cat.category.trim() !== '') // Filter out empty categories
          .map(cat => {
            const routeName = cat.category.toLowerCase().replace(/[^a-z0-9]/g, '');
            return {
              name: cat.category,
              link: `/${routeName}`,
              hasMegaMenu: true,
              megaCategory: cat.category,
              isbold: true
            };
          });
        
        const dynamicMobileItems = cats
          .filter(cat => cat.category && cat.category.trim() !== '')
          .map(cat => ({
            name: cat.category,
            megaCategory: cat.category
          }));
        
        setMenuItems([homeItem, ...dynamicDesktopItems]);
        setMenuItemss([{ name: "Home", link: "/" }, ...dynamicMobileItems]);
        
        console.log('✅ Dynamic menu items created:', dynamicDesktopItems.length, 'categories');
      }
    } catch (error) {
      console.error('❌ Navbar: Error fetching categories:', error);
    }
  };
  fetchCategories();
}, []);

// Handle search
const handleSearch = (e) => {
  e.preventDefault();
  if (searchQuery.trim()) {
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
  }
};

const handleSearchKeyPress = (e) => {
  if (e.key === 'Enter') {
    handleSearch(e);
  }
};


  return (
   <>
      <nav className="w-full flex items-center justify-center px-6 py-4 bg-[#0A0A0A] text-white font-semibold">
        
        {/* Left Nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
      {menuItems.map((item) => {
  const key = toKey(item.name);

  return (
    <div
      key={item.link}
      className="relative group cursor-pointer"
      onMouseEnter={() => {
           setIsClick(key)
        setIslineClick(key)
      }
      }     // <-- store lowercase
      onMouseLeave={() => setIsClick("home")}  // <-- keep lowercase default
    >
      <Link to={item.link}>
      <span
  className={`font-['Poppins',ui-sans-serif,system-ui,sans-serif] font-semibold text-[13px] leading-[1.1] uppercase whitespace-nowrap tracking-wide`}
>
  {item.name}
</span>
      </Link>

      {key === islineclick && (                         // <-- compare lowercase
        <div className="absolute left-0 -bottom-1 w-full h-[2px] bg-[#E5C870]" />
      )}

      {item.hasMegaMenu && isclick === key && (     // <-- compare lowercase
        <div className="absolute top-full left-[-20px] mt-1 z-50">
          <ProductMegaMenu category={item.megaCategory || item.name} />
        </div>
      )}
    </div>
  );
})}
        </div>

        {/* Center Logo */}
        <div className="flex-shrink-0 mx-8">
         <Link to={'/'}> <img src={logo} alt="DUCO ART Logo" className="h-6 object-contain" /></Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center border-b border-white gap-2 px-2 py-1">
            <FaSearch 
              className="text-white cursor-pointer" 
              onClick={handleSearch}
            />
            <input
              type="text"
              placeholder="Search For Products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="bg-transparent placeholder-white text-white outline-none"
            />
          </div>

          {/* Cart & Login/Profile */}
          <div className="flex items-center justify-center gap-4">
            <FaShoppingBag
              onClick={() => navigate("/cart")}
              className="text-white text-xl cursor-pointer"
            />
            {!user ? (
              <div
                onClick={() => setIsOpenLog(true)}
                className="text-white text-sm cursor-pointer border hidden md:flex border-white px-3 py-1 rounded-full hover:bg-white hover:text-black transition-all duration-300 shadow-sm"
              >
                Login
              </div>
            ) : (
              <RiAccountCircle2Fill
                onClick={() => navigate("/profile")}
                className="text-white text-3xl hidden md:flex cursor-pointer"
              />
            )}

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center justify-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center"
              >
                {mobileMenuOpen ? (
                  <FaTimes className="text-white text-xl" />
                ) : (
                  <FaBars className="text-white text-xl" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search */}
      <div className="md:hidden mt-2 relative flex items-center gap-2 px-2 py-1">
        <FaSearch 
          className="text-white cursor-pointer" 
          onClick={handleSearch}
        />
        <input
          type="text"
          placeholder="Search For Products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          className="bg-transparent placeholder-white text-white outline-none w-full"
        />
        {!user ? (
          <div
            onClick={() => setIsOpenLog(true)}
            className="text-white text-sm cursor-pointer border border-white px-2 py-1 rounded-full hover:bg-white hover:text-black transition-all duration-300 shadow-sm"
          >
            Login
          </div>
        ) : (
          <RiAccountCircle2Fill
            onClick={() => navigate("/profile")}
            className="text-white text-3xl cursor-pointer"
          />
        )}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
       <MobileSidebar menuItems={menuItemss} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}/>
      )}
    </>

  )
}

export default Navbar