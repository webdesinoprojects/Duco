import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { usePriceContext } from '../ContextAPI/PriceContext';

// Currency symbols map
const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toConvert, priceIncrease, currency } = usePriceContext();
  const currencySymbol = currencySymbols[currency] || "₹";

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    
    const searchProducts = async () => {
      if (!query.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get('https://duco-67o5.onrender.com/products/get');
        const allProducts = res.data || [];
        
        // Filter products by search query
        const filtered = allProducts.filter(product => {
          const searchLower = query.toLowerCase();
          return (
            product.products_name?.toLowerCase().includes(searchLower) ||
            product.Desciptions?.some(desc => desc.toLowerCase().includes(searchLower)) ||
            product.gender?.toLowerCase().includes(searchLower) ||
            product.category?.toLowerCase().includes(searchLower)
          );
        });
        
        setProducts(filtered);
      } catch (error) {
        console.error('Error searching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [query]);

  const calculatePrice = (currency, basePrice, increase) => {
    // ✅ CORRECT FORMULA: (Base + Markup%) * Conversion Rate
    if (!currency || !basePrice || increase === null) {
      return basePrice || 0;
    }
    const withMarkup = basePrice + (basePrice * (increase / 100));
    const finalPrice = currency && currency > 0 ? withMarkup * currency : withMarkup;
    return Math.round(finalPrice);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5C870] mx-auto mb-4"></div>
          <p>Searching for "{query}"...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            Search Results for "{query}"
          </h1>
          <p className="text-gray-400">
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </p>
        </div>

        {/* Results */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400 mb-4">No products found</p>
            <p className="text-gray-500">Try searching with different keywords</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {products.map((product) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="border border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#E5C870] transition-all"
              >
                <div className="aspect-square bg-white">
                  <img
                    src={product.image_url?.[0]?.url?.[0] || ''}
                    alt={product.products_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                    }}
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 truncate">
                    {product.products_name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">
                    {product.gender}
                  </p>
                  <p className="text-[#E5C870] font-bold">
                    {currencySymbol}{Math.round(
                      calculatePrice(
                        toConvert,
                        product.pricing?.[0]?.price_per || 0,
                        priceIncrease
                      )
                    ).toLocaleString('en-IN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
