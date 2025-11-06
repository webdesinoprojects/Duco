import React, { useState, useEffect } from "react";
import axios from "axios";

const Category = () => {
  const [category, setCategory] = useState("");
  const [subcatogry, setSubcatogry] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Fetch categories from API
  const getCategories = async () => {
    try {
      const res = await axios.get("https://duco-67o5.onrender.com/category/getall");
      setCategories(res.data.category || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Fetch subcategories from API
  const getSubCategories = async () => {
    try {
      const res = await axios.get("https://duco-67o5.onrender.com/subcategory/getallsubctg");
      setSubcategories(res.data.subCategory || []);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
    }
  };

  // Run once on load
  useEffect(() => {
    getCategories();
    getSubCategories();
  }, []);

  // Handle category submit
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://duco-67o5.onrender.com/category/create", { category });
      setCategory("");
      getCategories();
    } catch (err) {
      console.error("Error creating category:", err);
    }
  };

  // Handle subcategory submit
  const handleSubCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://duco-67o5.onrender.com/subcategory/create", {
        subcatogry,
        categoryId: [selectedCategoryId], // Assuming categoryId is an array
      });
      setSubcatogry("");
      setSelectedCategoryId("");
      getSubCategories();
    } catch (err) {
      console.error("Error creating subcategory:", err);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto font-sans">
      {/* Create Category */}
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Category</h2>
      <form onSubmit={handleCategorySubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={category}
          placeholder="Enter category"
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create
        </button>
      </form>

      {/* Create Subcategory */}
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Subcategory</h2>
      <form onSubmit={handleSubCategorySubmit} className="space-y-4 mb-8">
        <input
          type="text"
          value={subcatogry}
          placeholder="Enter subcategory"
          onChange={(e) => setSubcatogry(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-green-200"
        />
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-green-200"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.category}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Create
        </button>
      </form>

      

      {/* Show All Subcategories */}

      <div className="flex flex-row   justify-between">
        <div>
            {/* Show All Categories */}
      <h3 className="text-xl font-semibold mt-8 mb-2 text-gray-700">Available Categories</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-600">
        {categories.map((cat) => (
          <li key={cat._id}>{cat.category}</li>
        ))}
      </ul>

        </div>

        <div>
 <h3 className="text-xl font-semibold mt-8 mb-2 text-gray-700">Available Subcategories</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-600">
        {subcategories.map((sub) => (
          <li key={sub._id}>
             <strong>{sub.subcatogry}</strong>{" "}
            {sub.categoryId?.length > 0 && (
              <span className="text-sm text-gray-500">
                (Belongs to: {sub.categoryId[0]?.category})
              </span>
            )}
          </li>
        ))}
      </ul>
        </div>
       


      </div>
      
    </div>
  );
};

export default Category;
