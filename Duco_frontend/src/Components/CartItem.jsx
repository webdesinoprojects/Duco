import QuantityControlss from "./QuantityControlss";
import PriceDisplay from "./PriceDisplay";
import { RiEyeFill } from "react-icons/ri";
import { useState } from "react";
import { usePriceContext } from "../ContextAPI/PriceContext";

const CartItem = ({ item, removeFromCart, updateQuantity }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const { toConvert, priceIncrease } = usePriceContext();

  // ✅ Apply location pricing to a base price
  const applyLocationPricing = (basePrice, priceIncrease, conversionRate) => {
    let price = Number(basePrice) || 0;
    
    // Step 1: Apply percentage increase (location markup)
    if (priceIncrease) {
      price += (price * Number(priceIncrease)) / 100;
    }
    
    // Step 2: Apply currency conversion
    if (conversionRate && conversionRate !== 1) {
      price *= conversionRate;
    }
    
    // ✅ Don't round here - keep precision for calculations
    return price;
  };

  // ✅ Calculate total price with location pricing applied
  const totalPrice = Object.entries(item.quantity || {}).reduce(
    (acc, [size, qty]) => {
      // Check if item is from TShirtDesigner (custom item with already applied pricing)
      const isCustomItem = item.id && item.id.startsWith('custom-tshirt-');
      
      let basePrice = 0;
      
      if (isCustomItem) {
        // Custom items: use item.price as it's already converted
        basePrice = Number(item.price) || 0;
      } else {
        // Regular products: use pricing array for base INR price
        if (item.pricing && Array.isArray(item.pricing) && item.pricing.length > 0) {
          basePrice = Number(item.pricing[0]?.price_per) || 0;
        } else if (item.price) {
          basePrice = Number(item.price) || 0;
        }
      }
      
      let itemPrice;
      if (isCustomItem) {
        // Custom items already have location pricing applied
        itemPrice = basePrice;
        console.log(`💰 CartItem (Custom): ${item.products_name || item.name} - Pre-converted: ${itemPrice}, Qty: ${qty}`);
      } else {
        // Regular products - apply location pricing to base INR price
        itemPrice = applyLocationPricing(basePrice, priceIncrease, toConvert);
        console.log(`💰 CartItem (Regular): ${item.products_name || item.name} - Base INR: ${basePrice}, Final: ${itemPrice}, Qty: ${qty}`);
      }
      
      return acc + qty * itemPrice;
    },
    0
  );

  return (
    <div className="border-b border-gray-800 pb-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
        {/* Product Image */}
        <div className="w-full sm:w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg overflow-hidden shadow-md">
          <img
            src={
              item.previewImages?.front ||
              item.image_url?.[0]?.url?.[0] ||
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
              price={Math.ceil(totalPrice)}
              className="text-base sm:text-lg font-bold text-[#FDC305]"
              skipConversion={true}
            />
          </div>

          <div className="text-sm text-gray-300">{item.description}</div>

          {/* ✅ Quantity Handling (multi-size display) */}
          <div className="flex flex-wrap gap-2 mt-2">
            {item.quantity && typeof item.quantity === "object" ? (
              Object.entries(item.quantity).filter(([_, count]) => count > 0).length > 0 ? (
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
                <span className="px-2 py-1 text-xs rounded border">
                  Qty: 1
                </span>
              )
            ) : (
              <span className="px-2 py-1 text-xs rounded border">
                Qty: 1
              </span>
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
            {/* Design Preview - Only show if item has design */}
            {(item.design || item.previewImages) && (
              <button
                onClick={() => {
                  // Check for different design data structures
                  if (item.previewImages) {
                    // New structure from TShirtDesigner
                    const previews = [
                      item.previewImages.front && { url: item.previewImages.front, view: 'Front' },
                      item.previewImages.back && { url: item.previewImages.back, view: 'Back' },
                      item.previewImages.left && { url: item.previewImages.left, view: 'Left' },
                      item.previewImages.right && { url: item.previewImages.right, view: 'Right' },
                    ].filter(Boolean);
                    setPreviewImage(previews.length > 0 ? previews : null);
                  } else if (Array.isArray(item.design)) {
                    // Array format
                    setPreviewImage(item.design);
                  } else if (item.design && typeof item.design === 'object') {
                    // Object format - convert to array
                    const previews = [];
                    if (item.design.front?.uploadedImage || item.design.front?.customText) {
                      previews.push({ url: item.design.frontImage || item.design.front.uploadedImage, view: 'Front' });
                    }
                    if (item.design.back?.uploadedImage || item.design.back?.customText) {
                      previews.push({ url: item.design.backImage || item.design.back.uploadedImage, view: 'Back' });
                    }
                    if (item.design.left?.uploadedImage || item.design.left?.customText) {
                      previews.push({ url: item.design.leftImage || item.design.left.uploadedImage, view: 'Left' });
                    }
                    if (item.design.right?.uploadedImage || item.design.right?.customText) {
                      previews.push({ url: item.design.rightImage || item.design.right.uploadedImage, view: 'Right' });
                    }
                    setPreviewImage(previews.length > 0 ? previews : null);
                  } else {
                    setPreviewImage(null);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E5C870] text-black text-sm rounded-md hover:bg-gray-800 hover:text-white transition"
              >
                <RiEyeFill size={18} />
                Preview
              </button>
            )}

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
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full relative overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-black mb-4">Design Preview</h2>
            
            {Array.isArray(previewImage) && previewImage.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {previewImage.map((img, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={img.url}
                        alt={`${img.view} View`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = '/fallback.png';
                          e.target.alt = 'Preview not available';
                        }}
                      />
                    </div>
                    <span className="text-black font-semibold text-sm uppercase tracking-wide">
                      {img.view} View
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 font-medium text-lg">No design preview available</p>
                <p className="text-gray-500 text-sm mt-2">This is a plain t-shirt without custom design</p>
              </div>
            )}

            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartItem;
