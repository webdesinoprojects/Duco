import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { usePriceContext } from '../ContextAPI/PriceContext';
import { formatPrice } from '../utils/currencyUtils';

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
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const searchProducts = async () => {
      if (!query.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(
          'https://duco-67o5.onrender.com/products/get'
        );

        const searchLower = query.toLowerCase();

        const filtered = (res.data || []).filter(product => {
          return (
            product.products_name?.toLowerCase().includes(searchLower) ||
            product.Desciptions?.some(desc =>
              desc.toLowerCase().includes(searchLower)
            ) ||
            product.gender?.toLowerCase().includes(searchLower)
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

  const calculatePrice = (rate, basePrice, increase) => {
    if (!basePrice) return 0;
    const withMarkup = basePrice + (basePrice * (increase || 0)) / 100;
    return formatPrice((rate || 1) * withMarkup, currency);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        Searching for "{query}"...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Search Results for "{query}"
        </h1>
        <p className="text-gray-400 mb-6">
          {products.length} product(s) found
        </p>

        {products.length === 0 ? (
          <p className="text-gray-400">No products found</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {products.map(product => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="border border-gray-700 rounded-xl overflow-hidden hover:border-[#E5C870]"
              >
                <div className="bg-white aspect-square">
                  <img
                    src={product.image_url?.[0]?.url?.[0] || ''}
                    alt={product.products_name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">
                    {product.products_name}
                  </h3>

                  <p className="text-[#E5C870] font-bold mt-1">
                    {currencySymbol}
                    {calculatePrice(
                      toConvert,
                      product.pricing?.[0]?.price_per || 0,
                      priceIncrease
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
