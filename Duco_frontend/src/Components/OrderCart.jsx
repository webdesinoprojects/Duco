import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaExternalLinkAlt, FaShippingFast } from 'react-icons/fa';

const OrderCart = ({ order }) => {
  const [image, setImage] = useState("");

  const getOrderThumbnail = (product) => {
    // Debug log for thumbnail selection
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ Getting thumbnail for product:', {
        name: product?.name || product?.products_name,
        hasPreviewImages: !!product?.previewImages,
        hasDesign: !!product?.design,
        designKeys: product?.design ? Object.keys(product.design) : [],
        hasImageUrl: !!product?.image_url
      });
    }

    // Priority 1: Use front design preview if available (custom t-shirt)
    if (product?.previewImages?.front) {
      return product.previewImages.front;
    }
    
    // Priority 2: Use design frontView if available (backend flattened structure)
    if (product?.design?.frontView) {
      return product.design.frontView;
    }
    
    // Priority 3: Use design front uploadedImage if available
    if (product?.design?.front?.uploadedImage) {
      return product.design.front.uploadedImage;
    }

    // Priority 4: Check if design has any base64 image data
    if (product?.design) {
      const design = product.design;
      // Check for any base64 image in design object
      for (const [key, value] of Object.entries(design)) {
        if (typeof value === 'string' && value.startsWith('data:image/')) {
          return value;
        }
      }
    }
    
    // Priority 5: Use product image by color
    if (product?.image_url && product.color) {
      const match = product.image_url.find(
        (img) => img.colorcode?.toLowerCase() === product.color?.toLowerCase()
      );
      const imageUrl = match?.url?.[0] || product.image_url[0]?.url?.[0];
      if (imageUrl) {
        return imageUrl;
      }
    }
    
    // Priority 6: Fallback to first available product image
    if (product?.image_url?.[0]?.url?.[0]) {
      return product.image_url[0].url[0];
    }

    // Priority 7: Check for direct image property
    if (product?.image) {
      return product.image;
    }
    return null;
  };

  useEffect(() => {
    const orderImage = getOrderThumbnail(order.products[0]);
    setImage(orderImage);
  }, [order]);

  return (
    <Link to={`/get/logistics/${order._id}`} className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 bg-[#E5C870] rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200/40 w-full max-w-full sm:max-w-3xl">
      
      {/* Product Image */}
      <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-lg overflow-hidden border border-slate-200">
        {image ? (
          <img
            src={image}
            alt={order.products[0]?.products_name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to a default t-shirt image if the image fails to load
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDOTQuNDc3MiA3MCA5MCA3NC40NzcyIDkwIDgwVjEyMEM5MCA5NC40NzcyIDk0LjQ3NzIgOTAgMTAwIDkwSDEwMEMxMDUuNTIzIDkwIDExMCA5NC40NzcyIDExMCAxMjBWODBDMTEwIDc0LjQ3NzIgMTA1LjUyMyA3MCAxMDAgNzBaIiBmaWxsPSIjZTVlN2ViIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAiIGZpbGw9IiNkMWQ1ZGIiLz4KPC9zdmc+';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between flex-grow w-full">
        
        {/* Top Row: Status + Cancel Button */}
        <div className="flex w-full items-center justify-between">
          <span
            className={`text-xs sm:text-sm font-medium tracking-wide uppercase px-3 py-1 rounded-full shadow-sm
              ${
                order.status === "Pending"
                  ? "bg-amber-500 text-white"
                  : order.status === "Processing"
                  ? "bg-sky-500 text-white"
                  : order.status === "Shipped"
                  ? "bg-purple-500 text-white"
                  : order.status === "Delivered"
                  ? "bg-emerald-500 text-white"
                  : order.status === "Cancelled"
                  ? "bg-rose-500 text-white"
                  : "bg-gray-400 text-white"
              }
            `}
          >
            {order.status}
          </span>

          {order.status !== "Delivered" && order.status !== "Cancelled" && (
            <button className="text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 px-3 py-1 rounded-md bg-rose-50 hover:bg-rose-100 transition-colors shadow-sm ml-3 shrink-0">
              Cancel
            </button>
          )}
        </div>

        {/* Product Name & Delivery Date */}
        <div className="mt-2">
          <h2 className="text-slate-900 font-semibold text-sm sm:text-base leading-snug max-w-full sm:max-w-none break-words">
            {order.products[0]?.products_name}
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-700 font-medium mt-1 flex items-center gap-1">
            Expected Delivery:{" "}
            {(() => {
              const deliveryDate = order.printroveEstimatedDelivery || order.deliveryExpectedDate;
              return deliveryDate ? new Date(deliveryDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
              }) : 'TBD';
            })()}
            {order.printroveEstimatedDelivery && (
              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full">
                Duco Art
              </span>
            )}
          </p>
        </div>

        {/* Price & Quantity */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {Object.entries(order?.quantity || {}).map(([size, count]) =>
              Number(count) > 0 ? (
                <span key={size} className="px-2 py-1 bg-black text-white text-xs rounded border">
                  {size} × {count}
                </span>
              ) : null
            )}
          </div>
          <p className="text-gray-800 text-sm sm:text-base font-semibold">
            ₹{(order.totalPay || order.price).toFixed(2)}
          </p>
        </div>

        {/* Tracking Info */}
        {(order.canTrack || order.printroveOrderId || order.hasLogistics) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <FaShippingFast className="text-gray-600" />
            <span className="text-gray-600">
              {order.printroveOrderId ? 'Duco Art Tracking Available' : 
               order.hasLogistics ? 'Logistics Updates Available' : 
               'Tracking Available'}
            </span>
            {order.trackingUrl && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  window.open(order.trackingUrl, '_blank');
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Track Shipment"
              >
                <FaExternalLinkAlt className="text-xs" />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default OrderCart;
