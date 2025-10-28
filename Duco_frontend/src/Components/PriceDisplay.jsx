import React from "react";

const PriceDisplay = ({ price, className }) => {
  // Convert price to integer
  const displayPrice = Math.ceil(Number(price));

  return <p className={className}>₹{displayPrice}</p>;
};

export default PriceDisplay;
