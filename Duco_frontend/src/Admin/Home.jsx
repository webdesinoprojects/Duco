import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminCartItem from './Components/AdminCartItem';
import tshirt from "../assets/gloomy-young-black-model-clean-white-unlabeled-cotton-t-shirt-removebg-preview.png";
import axios from "axios";
import { API_BASE_URL } from "../config/api.js";

const Home = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Fetch products function
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/products/get`);
      setProducts(res.data); // ✅ use res.data
      console.log("✅ Products fetched:", res.data.length);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch on mount and when refreshProducts flag is set
  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ Refresh products if coming from product creation
  useEffect(() => {
    if (location.state?.refreshProducts) {
      console.log("🔄 Refreshing products after creation...");
      fetchProducts();
    }
  }, [location.state?.refreshProducts]);

  // Filter products based on search query
  const filteredProducts = products.filter((p) =>
    p.products_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Additional state or functions from previous updates can go here
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/products/deleted/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      console.log("Deleted product:", id);
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-center mt-4">Welcome to Admin Dashboard</h1>
      
      <div className="max-w-4xl mx-auto mt-6 p-4">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search clothes by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <p className="text-center text-gray-500 py-8">⏳ Loading products...</p>
        )}

        {/* Products List */}
        {!loading && filteredProducts.length > 0 ? (
          filteredProducts.map((p, i) => (
            <AdminCartItem
              key={i}
              product={{
                id: p._id,
                products_name: p.products_name,
                Stock: p.Stock,
                image: p.image_url?.[0].url[0],
                image_url: p.image_url,
                fulldetails: p,
              }}
              onEdit={(id) => console.log("Edit clicked for:", id)}
              onDelete={handleDelete} // Added delete functionality
            />
          ))
        ) : (
          !loading && (
            <p className="text-center text-gray-500 py-8">
              {searchQuery ? `No products found matching "${searchQuery}"` : "No products available"}
            </p>
          )
        )}
      </div>
    </>
  );
};

export default Home;
