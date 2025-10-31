import React, { useState, useEffect } from 'react';
import Navbar from "../Admin/Navbar";
import AdminCartItem from './Components/AdminCartItem';
import tshirt from "../assets/gloomy-young-black-model-clean-white-unlabeled-cotton-t-shirt-removebg-preview.png";
import axios from "axios";

const Home = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:3000/products/get");
        setProducts(res.data); // ✅ use res.data
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    fetchData();
  }, []);

  // Additional state or functions from previous updates can go here
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/products/delete/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      console.log("Deleted product:", id);
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  return (
    <>
      {/* Added Navbar from previous updates */}
      <Navbar />

      <h1 className="text-2xl font-bold text-center mt-4">Welcome to Admin Dashboard</h1>
      
      <div className="max-w-4xl mx-auto mt-6 p-4">
        {products?.map((p, i) => (
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
        ))}
      </div>
    </>
  );
};

export default Home;
