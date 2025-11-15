import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api.js";
import { toast } from "react-toastify";
import CategoryNavbarHelper from "./Components/CategoryNavbarHelper.jsx";

const Category = () => {
  const [showNavbarHelper, setShowNavbarHelper] = useState(false);
  const [category, setCategory] = useState("");
  const [subcatogry, setSubcatogry] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [editSubcategoryParent, setEditSubcategoryParent] = useState("");

  // Fetch categories from API
  const getCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/category/getall`);
      setCategories(res.data.category || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Failed to fetch categories");
    }
  };

  // Fetch subcategories from API
  const getSubCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/subcategory/getallsubctg`);
      setSubcategories(res.data.subCategory || []);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
      toast.error("Failed to fetch subcategories");
    }
  };

  // Run once on load
  useEffect(() => {
    const fetchData = async () => {
      setFetchingData(true);
      await Promise.all([getCategories(), getSubCategories()]);
      setFetchingData(false);
    };
    fetchData();
  }, []);

  // Handle category submit
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!category.trim()) {
      toast.warning("Please enter a category name");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/category/create`, { category });
      setCategory("");
      toast.success(res.data.message || "Category created successfully!");
      await getCategories();
    } catch (err) {
      console.error("Error creating category:", err);
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  // Handle subcategory submit
  const handleSubCategorySubmit = async (e) => {
    e.preventDefault();
    if (!subcatogry.trim()) {
      toast.warning("Please enter a subcategory name");
      return;
    }
    if (!selectedCategoryId) {
      toast.warning("Please select a parent category");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/subcategory/create`, {
        subcatogry,
        categoryId: [selectedCategoryId],
      });
      setSubcatogry("");
      setSelectedCategoryId("");
      toast.success(res.data.message || "Subcategory created successfully!");
      await getSubCategories();
    } catch (err) {
      console.error("Error creating subcategory:", err);
      toast.error(err.response?.data?.message || "Failed to create subcategory");
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will also delete all its subcategories.`)) {
      return;
    }
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/category/delete/${id}`);
      toast.success(res.data.message || "Category deleted successfully!");
      await Promise.all([getCategories(), getSubCategories()]);
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error(err.response?.data?.message || "Failed to delete category");
    }
  };

  // Delete subcategory
  const handleDeleteSubcategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/subcategory/delete/${id}`);
      toast.success(res.data.message || "Subcategory deleted successfully!");
      await getSubCategories();
    } catch (err) {
      console.error("Error deleting subcategory:", err);
      toast.error(err.response?.data?.message || "Failed to delete subcategory");
    }
  };

  // Start editing category
  const startEditCategory = (cat) => {
    setEditingCategory(cat._id);
    setEditCategoryName(cat.category);
  };

  // Cancel editing category
  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName("");
  };

  // Save edited category
  const saveEditCategory = async (id) => {
    if (!editCategoryName.trim()) {
      toast.warning("Category name cannot be empty");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/category/update/${id}`, {
        category: editCategoryName,
      });
      toast.success(res.data.message || "Category updated successfully!");
      setEditingCategory(null);
      setEditCategoryName("");
      await getCategories();
    } catch (err) {
      console.error("Error updating category:", err);
      toast.error(err.response?.data?.message || "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  // Start editing subcategory
  const startEditSubcategory = (sub) => {
    setEditingSubcategory(sub._id);
    setEditSubcategoryName(sub.subcatogry);
    setEditSubcategoryParent(sub.categoryId?.[0]?._id || "");
  };

  // Cancel editing subcategory
  const cancelEditSubcategory = () => {
    setEditingSubcategory(null);
    setEditSubcategoryName("");
    setEditSubcategoryParent("");
  };

  // Save edited subcategory
  const saveEditSubcategory = async (id) => {
    if (!editSubcategoryName.trim()) {
      toast.warning("Subcategory name cannot be empty");
      return;
    }
    if (!editSubcategoryParent) {
      toast.warning("Please select a parent category");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/subcategory/update/${id}`, {
        subcatogry: editSubcategoryName,
        categoryId: [editSubcategoryParent],
      });
      toast.success(res.data.message || "Subcategory updated successfully!");
      setEditingSubcategory(null);
      setEditSubcategoryName("");
      setEditSubcategoryParent("");
      await getSubCategories();
    } catch (err) {
      console.error("Error updating subcategory:", err);
      toast.error(err.response?.data?.message || "Failed to update subcategory");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="p-6 max-w-xl mx-auto font-sans flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Category Management</h1>
        <button
          onClick={() => setShowNavbarHelper(!showNavbarHelper)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
        >
          {showNavbarHelper ? "Hide" : "Show"} Navbar Helper
        </button>
      </div>

      {showNavbarHelper && (
        <div className="mb-8">
          <CategoryNavbarHelper />
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Create Category */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-blue-600">📁</span> Create Category
          </h2>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <input
              type="text"
              value={category}
              placeholder="Enter category name (e.g., T-Shirts, Hoodies)"
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !category.trim()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create Category"}
            </button>
          </form>
        </div>

        {/* Create Subcategory */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-green-600">📂</span> Create Subcategory
          </h2>
          <form onSubmit={handleSubCategorySubmit} className="space-y-4">
            <input
              type="text"
              value={subcatogry}
              placeholder="Enter subcategory name (e.g., Round Neck, V-Neck)"
              onChange={(e) => setSubcatogry(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-100"
            />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-100"
            >
              <option value="">Select a parent category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.category}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading || !subcatogry.trim() || !selectedCategoryId}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create Subcategory"}
            </button>
          </form>
        </div>
      </div>

      {/* Display Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Show All Categories */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-blue-600">📋</span> Available Categories
            <span className="ml-auto text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {categories.length}
            </span>
          </h3>
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No categories yet. Create one above!</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li 
                  key={cat._id} 
                  className="p-3 bg-blue-50 rounded-md border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  {editingCategory === cat._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEditCategory(cat._id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditCategory}
                        disabled={loading}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{cat.category}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat._id, cat.category)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Show All Subcategories */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-green-600">📋</span> Available Subcategories
            <span className="ml-auto text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {subcategories.length}
            </span>
          </h3>
          {subcategories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No subcategories yet. Create one above!</p>
          ) : (
            <ul className="space-y-2">
              {subcategories.map((sub) => (
                <li 
                  key={sub._id} 
                  className="p-3 bg-green-50 rounded-md border border-green-100 hover:bg-green-100 transition-colors"
                >
                  {editingSubcategory === sub._id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editSubcategoryName}
                        onChange={(e) => setEditSubcategoryName(e.target.value)}
                        className="w-full px-2 py-1 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                        placeholder="Subcategory name"
                        autoFocus
                      />
                      <select
                        value={editSubcategoryParent}
                        onChange={(e) => setEditSubcategoryParent(e.target.value)}
                        className="w-full px-2 py-1 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="">Select parent category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.category}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditSubcategory(sub._id)}
                          disabled={loading}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditSubcategory}
                          disabled={loading}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-gray-800">{sub.subcatogry}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditSubcategory(sub)}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(sub._id, sub.subcatogry)}
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {sub.categoryId?.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Parent: <span className="font-medium">{sub.categoryId[0]?.category}</span>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Category;
