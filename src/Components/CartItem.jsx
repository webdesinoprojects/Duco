import QuantityControlss from "./QuantityControlss";
import PriceDisplay from "./PriceDisplay";
import { RiEyeFill } from "react-icons/ri";
import { useState } from "react";
import { usePriceContext } from "../ContextAPI/PriceContext";

const CartItem = ({ item, removeFromCart, updateQuantity }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const { toConvert, priceIncrease } = usePriceContext();

  function calculatePrice(currency, ac, high) {
    if (!currency || !ac || high === null) {
      return ac || 0; // Return base price if context not ready
    }
    const actualPrice = currency * ac;
    const finalPrice = actualPrice + actualPrice * (high / 100);
    return Math.ceil(finalPrice); // ✅ round up to integer
  }

  // Sum price for all sizes
  const totalPrice = Object.entries(item.quantity || {}).reduce(
    (acc, [size, qty]) => acc + qty * item.price,
    0
  );

  return (
    <div className="border-b border-gray-800 pb-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
        {/* Product Image */}
        <div className="w-full sm:w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg overflow-hidden shadow-md">
          <img
            src={
              item.image_url?.[0]?.url?.[0] ||
              item.previewImages?.front ||
              "/fallback.png" // ✅ safe fallback
            }
            alt={item.products_name || item.name || "Custom T-Shirt"}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 flex flex-col gap-1 text-white">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">
              {item.products_name || item.name || "Custom T-Shirt"}
            </h2>
            <PriceDisplay
              price={totalPrice}
              className="text-base sm:text-lg font-bold text-[#FDC305]"
            />
          </div>

          <div className="text-sm text-gray-300">{item.description}</div>

          {/* ✅ Quantity Handling (multi-size display) */}
          <div className="flex flex-wrap gap-2 mt-2">
            {item.quantity && typeof item.quantity === "object" ? (
              Object.entries(item.quantity).filter(([_, count]) => count > 0)
                .length > 0 ? (
                Object.entries(item.quantity).map(([size, count]) =>
                  count > 0 ? (
                    <span
                      key={size}
                      className="px-2 py-1 text-xs rounded border bg-gray-800 text-white"
                    >
                      {size} × {count}
                    </span>
                  ) : null
                )
              ) : (
                <span className="px-2 py-1 text-xs rounded border">Qty: 1</span>
              )
            ) : (
              <span className="px-2 py-1 text-xs rounded border">Qty: 1</span>
            )}
          </div>

          <div className="flex gap-4 mt-2 flex-wrap text-sm text-gray-400">
            <p className="flex items-center">
              <span className="text-white font-medium mr-1">Color:</span>
              <span
                className="inline-block w-4 h-4 rounded-full border border-white"
                style={{ backgroundColor: item.color }}
              ></span>
            </p>
            <p>
              <span className="text-white font-medium">Gender:</span>{" "}
              {item?.gender}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            {/* Design Preview */}
            <button
              onClick={() => setPreviewImage(item.design)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#E5C870] text-black text-sm rounded-md hover:bg-gray-800 hover:text-white transition"
            >
              <RiEyeFill size={18} />
              Preview
            </button>

            {/* Remove Button */}
            <button
              onClick={removeFromCart}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100 transition"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16m-4 0V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>

      {previewImage !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-3xl w-full relative overflow-y-auto max-h-[90vh]">
            {Array.isArray(previewImage) && previewImage.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {previewImage.map((img, index) => (
                  <div key={index} className="flex flex-col justify-center">
                    <img
                      src={img.url}
                      alt={`Design Preview ${index + 1}`}
                      className="w-full h-auto object-contain rounded border"
                    />
                    <span className="text-black font-bold text-center">
                      {img.view}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 font-medium">
                No preview is there
              </p>
            )}

            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-black text-white px-2 py-1 text-xs rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartItem;
