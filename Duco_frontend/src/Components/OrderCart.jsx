import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaExternalLinkAlt, FaShippingFast } from "react-icons/fa";

const OrderCart = ({ order }) => {
  const [image, setImage] = useState("");

  if (!Array.isArray(order?.products) || order.products.length === 0) {
    return null;
  }

  const product = order.products[0];

  const isUrl = (value) =>
    typeof value === "string" && /^https?:\/\//i.test(value);

  /* -------------------- thumbnail -------------------- */
  const getThumbnail = (p, orderData) => {
    if (!p) return null;

    // Check product previewImages
    if (isUrl(p?.previewImages?.front)) return p.previewImages.front;
    
    // Check product design (front, not frontView)
    if (isUrl(p?.design?.front)) return p.design.front;
    if (isUrl(p?.design?.frontView)) return p.design.frontView;

    // Check order-level designImages
    if (orderData?.designImages) {
      if (isUrl(orderData.designImages?.front)) return orderData.designImages.front;
      if (Array.isArray(orderData.designImages) && orderData.designImages.length > 0) {
        if (isUrl(orderData.designImages[0])) return orderData.designImages[0];
      }
    }

    // Check product image_url array
    const imageUrl = p?.image_url?.[0]?.url?.[0];
    if (isUrl(imageUrl)) return imageUrl;
    
    // Check direct image_url if it's a string
    if (isUrl(p?.image_url?.[0]?.url)) return p.image_url[0].url;
    
    // Check product image
    if (isUrl(p?.image)) return p.image;

    return null;
  };

  useEffect(() => {
    setImage(getThumbnail(product, order));
  }, [product, order]);

  /* -------------------- ALWAYS RENDER ORDER -------------------- */
  return (
    <Link
      to={`/get/logistics/${order._id}`}
      className="flex flex-col sm:flex-row gap-4 bg-[#E5C870] rounded-xl p-4 shadow-md w-full max-w-3xl"
    >
      {/* Image */}
      <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt="Product" className="w-full h-full object-contain" />
        ) : (
          <svg
            viewBox="0 0 64 64"
            className="w-10 h-10 text-gray-300"
            aria-hidden="true"
          >
            <rect x="8" y="12" width="48" height="40" rx="6" fill="currentColor" />
            <circle cx="24" cy="28" r="6" fill="#fff" />
            <path d="M16 46l12-12 8 8 6-6 6 10H16z" fill="#fff" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow">
        <span className="text-xs font-semibold uppercase bg-black text-white px-3 py-1 rounded-full w-fit">
          {order.status || "Pending"}
        </span>

        <h2 className="mt-2 font-semibold text-sm">
          {product?.products_name || product?.name || "Product unavailable"}
        </h2>

        <p className="text-xs text-gray-700 mt-1">
          Order ID: {order.orderId || order._id}
        </p>

        <p className="text-xs text-gray-700">
          Placed on:{" "}
          {new Date(order.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>

        <p className="mt-2 font-semibold text-sm">
          ₹{Number(order.totalAmount ?? order.totalPay ?? order.price ?? 0).toFixed(2)}
        </p>

        {(order.printroveOrderId || order.hasLogistics) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
            <FaShippingFast />
            Tracking available
            {order.trackingUrl && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  window.open(order.trackingUrl, "_blank");
                }}
              >
                <FaExternalLinkAlt />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default OrderCart;
