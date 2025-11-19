import React, { useState, useEffect } from 'react'
import tshirt from "../assets/gloomy-young-black-model-clean-white-unlabeled-cotton-t-shirt-removebg-preview.png"
import { Link, useParams } from 'react-router-dom'
import { FaFilter } from "react-icons/fa";
import { getproductcategory } from "../Service/APIservice"
import { usePriceContext } from '../ContextAPI/PriceContext';

const SaerchingPage = () => {
  const [prodcuts, setProdcuts] = useState([])
  const { id, catogory_name } = useParams()
  const { toConvert, priceIncrease } = usePriceContext();
  
  // Filter states
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [sortOption, setSortOption] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Scroll to top when category changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [id, catogory_name]);

  function calculatePrice(currency, ac, high) {
    const actualPrice = currency * ac
    return actualPrice + (actualPrice * (high / 100));

  }

  useEffect(() => {
    const fetchdata = async () => {
      const data = await getproductcategory(id);
      if (data) {
        setProdcuts(data)
      }
      else {
        console.log("No Products is available")
      }
    }
    fetchdata()
  }, [id])

  // Handle size filter
  const handleSizeChange = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Apply filters and sorting
  const filteredProducts = prodcuts
    .filter((p) => {
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
      return 0;
    });

  return (
    <div className=" text-white min-h-screen p-4">
      {/* Breadcrumb */}


      {/* Heading and product count */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-white text-2xl">{catogory_name}</span>
        <span className="text-gray-500">{filteredProducts.length} Products</span>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Filters - Desktop */}
        <aside className="md:block hidden w-1/5 space-y-6">
          <div>
            <h2 className="font-semibold mb-2">Sizes</h2>
            <div className="space-y-1">
              {['XS', 'S', 'M', 'L', 'XL'].map(size => (
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

        {/* Right content */}
        <div className="flex-1">
          {/* Sort bar */}
          <div className="flex justify-between items-center mb-4">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-[#E5C870] text-black rounded-lg font-medium"
            >
              <FaFilter />
              Filters
            </button>
            <div className="hidden md:block">
              <FaFilter className="text-gray-400" />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm">Sort:</label>
              <select 
                className="border border-gray-300 rounded px-3 py-1.5 bg-black text-sm"
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
            {filteredProducts?.map((item) => (
              <Link to={`/products/${item._id}`} key={item._id} className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md">
                <div className="relative p-3">
                  <img
                    src={item.image_url[0]?.url[0]}
                    alt="T-Shirt Design"
                    className="w-[200px] bg-white  object-cover "
                  />
                  <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">Oversized Fit</div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold">{item.products_name}</h3>

                  <p className=" text-sm font-bold mt-2">₹{calculatePrice(toConvert, item.pricing[0]?.price_per, priceIncrease)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="fixed right-0 top-0 h-full w-80 bg-[#0A0A0A] shadow-xl overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h2 className="text-xl font-bold">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-2xl text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              {/* Sizes */}
              <div>
                <h3 className="font-semibold mb-3">Sizes</h3>
                <div className="space-y-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                    <label key={size} className="flex items-center">
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

              {/* Apply Button */}
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-[#E5C870] text-black py-3 rounded-lg font-semibold mt-6"
              >
                Apply Filters
              </button>

              {/* Clear Filters */}
              {selectedSizes.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedSizes([]);
                  }}
                  className="w-full border border-gray-600 text-white py-2 rounded-lg font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SaerchingPage