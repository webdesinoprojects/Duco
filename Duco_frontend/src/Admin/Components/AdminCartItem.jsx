import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const AdminCartItem = ({ product }) => {
  const navigator = useNavigate();
  const [openColors, setOpenColors] = useState(false); // toggle for all colors

  const onEdit = async (id) => {
    navigator(`/admin/edit/${id}`, { state: product?.fulldetails });
  };

  const onDeleted = async (id) => {
    try {
      const res = await axios.delete(
        `https://duco-67o5.onrender.com/products/deleted/${id}`
      );
      if (res) {
        toast.success("Product Is Deleted");
        window.location.reload();
      }
    } catch (error) {
      console.log(`Error in deleting ${error}`);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white shadow-md rounded-2xl p-4 mb-4">
      {/* Product Image */}
      <img
        src={product.image}
        alt={product.products_name}
        className="w-20 h-20 object-cover rounded-xl border"
      />

      {/* Product Info */}
      <div className="flex-1 ml-4">
        <h3 className="text-lg font-semibold">{product.products_name}</h3>

        {/* Toggle Button */}
        <button
          onClick={() => setOpenColors(!openColors)}
          className="mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-4 py-2 rounded-md transition"
        >
          {openColors ? "▲ Hide Variants" : "▼ Show Variants"}
        </button>

        {/* Colors & Sizes - only visible when open */}
        {openColors && (
          <div className="flex flex-col gap-5 mt-3">
            {product.image_url?.map((colorItem, colorIndex) => (
              <div
                key={colorItem._id || colorIndex}
                className="border p-3 rounded-md shadow-sm bg-white"
              >
                <p className="font-medium capitalize">{colorItem.color}</p>

                <div className="flex gap-4 flex-wrap mt-3">
                  {colorItem.content.map((sizeItem, sizeIndex) => (
                    <div
                      key={sizeItem._id || sizeIndex}
                      className="border px-3 py-1 rounded bg-gray-100"
                    >
                      <p className="text-sm text-gray-700 font-semibold">
                        Size: {sizeItem.size}
                      </p>
                      <p className="text-xs text-gray-500">
                        Stock: {sizeItem.minstock}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <button
        onClick={() => onEdit(product.id)}
        className="bg-blue-600 hover:bg-blue-700 ml-3 text-white font-medium py-2 px-4 rounded-xl transition"
      >
        ✏️ Edit
      </button>
      <button
        onClick={() => onDeleted(product.id)}
        className="bg-red-600 hover:bg-red-700 ml-3 text-white font-medium py-2 px-4 rounded-xl transition"
      >
        🗑️ Delete
      </button>
    </div>
  );
};

export default AdminCartItem;
