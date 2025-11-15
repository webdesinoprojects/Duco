import React, { useState, useEffect } from 'react';
import { getCategories } from '../../Service/APIservice';
import { FiCopy, FiCheck } from 'react-icons/fi';

/**
 * Helper component to show how to add categories to the navbar
 * Shows all categories and provides copy-paste code
 */
const CategoryNavbarHelper = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const generateNavbarCode = (cat) => {
    const routeName = cat.category.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `{ name: "${cat.category}", link: "/${routeName}", hasMegaMenu: true, megaCategory: "${cat.category}", isbold: true }`;
  };

  const generateMobileCode = (cat) => {
    return `{ name: "${cat.category}", megaCategory: "${cat.category}" }`;
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        📋 Add Categories to Navbar
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Copy the code for the category you want to add</li>
          <li>Open <code className="bg-blue-100 px-2 py-1 rounded">Duco_frontend/src/Components/Navbar.jsx</code></li>
          <li>Find the <code className="bg-blue-100 px-2 py-1 rounded">menuItems</code> array (around line 11)</li>
          <li>Paste the code before the closing bracket <code className="bg-blue-100 px-2 py-1 rounded">];</code></li>
          <li>Do the same for <code className="bg-blue-100 px-2 py-1 rounded">menuItemss</code> array (mobile menu)</li>
          <li>Save the file and refresh your browser</li>
        </ol>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500">No categories found. Create some first!</p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, index) => (
            <div key={cat._id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">
                {cat.category}
              </h3>
              
              {/* Desktop Navbar Code */}
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Desktop Navbar Code:
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {generateNavbarCode(cat)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generateNavbarCode(cat), `desktop-${index}`)}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === `desktop-${index}` ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      <FiCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Navbar Code */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Mobile Navbar Code:
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {generateMobileCode(cat)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generateMobileCode(cat), `mobile-${index}`)}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === `mobile-${index}` ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      <FiCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
          <li>Make sure to add a comma after the previous menu item</li>
          <li>The category name in the code must match exactly what you created</li>
          <li>After adding, create subcategories for this category to show in the dropdown</li>
          <li>The link (e.g., <code className="bg-yellow-100 px-1 rounded">/men</code>) should match your routing</li>
        </ul>
      </div>
    </div>
  );
};

export default CategoryNavbarHelper;
