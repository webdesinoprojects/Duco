import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const OrderCart = ({ order }) => {
  const [image, setImage] = useState("");

  const getFirstImageByColor = (product) => {
    if (!product?.image_url || !product.color) return null;
    const match = product.image_url.find(
      (img) => img.colorcode?.toLowerCase() === product.color.toLowerCase()
    );
    return match?.url?.[0] || null;
  };

  useEffect(() => {
    const orderImage = getFirstImageByColor(order.products[0]);
    setImage(orderImage);
  }, [order]);

  return (
    <Link to={`/get/logistics/${order._id}`} className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 bg-[#E5C870] rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200/40 w-full max-w-full sm:max-w-3xl">
      
      {/* Product Image */}
      <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-lg overflow-hidden border border-slate-200">
        <img
          src={image}
          alt={order.products[0]?.products_name}
          className="w-full h-full object-contain"
        />
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
          <p className="text-[11px] sm:text-xs text-gray-700 font-medium mt-1">
            Expected Delivery:{" "}
            {new Date(order.deliveryExpectedDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
            })}
          </p>
        </div>

        {/* Price & Quantity */}
        <div className="mt-3 flex items-center justify-between">
          <div className=" bg-amber-300 flex-wrap gap-1">
  {Object.entries(order?.quantity || {}).map(([size, count]) =>
    Number(count) > 0 ? (
      <span key={size} className="px-1 py-0.5 bg-black text-sm rounded border">
        {size} × {count}
      </span>
    ) : null
  )}
</div>
          <p className="text-gray-800 text-sm sm:text-base font-semibold">
            ₹{order.price.toFixed(2)}
          </p>
         

        </div>
      </div>
    </Link>
  );
};

export default OrderCart;
