import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../ContextAPI/CartContext";
import { usePriceContext } from "../ContextAPI/PriceContext";

const currencySymbols = {
  INR: "₹",
  USD: "$",
  AED: "د.إ",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  NZD: "NZ$",
  CHF: "CHF",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  MYR: "RM",
  THB: "฿",
  SAR: "﷼",
  QAR: "ر.ق",
  KWD: "KD",
  BHD: "BD",
  OMR: "﷼",
  ZAR: "R",
  PKR: "₨",
  LKR: "Rs",
  BDT: "৳",
  NPR: "रू",
  PHP: "₱",
  IDR: "Rp",
  KRW: "₩",
};

const BoxOfProducts = ({ price, title, id, image }) => {
  const colors = ["#FF0000", "#FF8A00", "#4A4AFF", "#FFFFFF", "#000000"];
  const { addtocart } = useContext(CartContext);
  const { toConvert, priceIncrease, resolvedLocation, currency } =
    usePriceContext();

  const currencySymbol = currencySymbols[currency] || "₹";

  // ✅ Corrected price calculation
  const finalPrice = useMemo(() => {
    let base = Number(price) || 0;

    if (priceIncrease) {
      base += (base * Number(priceIncrease)) / 100;
    }

    if (toConvert && toConvert !== 1) {
      base *= Number(toConvert);
    }

    return Math.round(base);
  }, [price, toConvert, priceIncrease]);

  return (
    <Link
      to={`/products/${id}`}
      className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out"
    >
      {/* 🖼️ Image & Color Swatches */}
      <div className="relative bg-[#F9F5EB] flex justify-center items-end rounded-t-3xl">
        {/* 🎨 Color Circles */}
        <div className="absolute top-4 left-4 flex flex-col gap-3 z-10">
          {colors.map((color) => (
            <span
              key={color}
              className="w-5 h-5 rounded-full border border-gray-300 shadow-md"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Product Image */}
        {image ? (
          <img
            src={image}
            alt={title || "Product"}
            className="h-[250px] object-contain z-0"
          />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* 📄 Text Section */}
      <div className="px-5 pt-4 pb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-1 tracking-tight">
          {title || "Classic Crew T-Shirt"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Soft cotton fabric, modern fit, and available in 5 elegant colors.
        </p>

        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">
            {currencySymbol}
            {finalPrice}
            {resolvedLocation && (
              <span className="text-xs text-gray-500">
                {" "}
                ({resolvedLocation})
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addtocart({
                id,
                design: [],
                color: "white",
                quantity: 1,
                price: Number(finalPrice),
              });
            }}
            className="px-4 py-1.5 bg-[#E5C870] text-black text-sm font-medium rounded-full hover:bg-gray-800 hover:text-white transition"
          >
            Add to Bag
          </button>
        </div>
      </div>
    </Link>
  );
};

export default BoxOfProducts;
