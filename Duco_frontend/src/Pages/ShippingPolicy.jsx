import React from "react";

export default function ShippingPolicy() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0f2d] to-[#000000] p-6">
      <div className="max-w-4xl mx-auto text-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-white">
          Shipping Policy
        </h1>

        <p className="mb-4">
          The orders for the users are shipped through registered domestic
          courier companies and/or speed post only.
        </p>

        <p className="mb-4">
          The product will be delivered to your location within{" "}
          <strong className="text-gray-100">6-7 days</strong>.
        </p>

        <p className="mb-4">
          Orders are shipped within{" "}
          <strong className="text-gray-100">7 days</strong> from the date of the
          order and/or payment or as per the delivery date agreed at the time of
          order confirmation, subject to courier company/post office norms.
        </p>

        <p className="mb-4">
          <strong className="text-gray-100">DucoArt</strong> shall not be liable
          for any delay in delivery by the courier company/postal authority.
        </p>

        <p className="mb-4">
          Delivery of all orders will be made to the address provided by the
          buyer at the time of purchase. Delivery of our services will be
          confirmed on your registered email ID.
        </p>

        <p className="mb-4">
          If there are any shipping cost(s) levied by the seller or by{" "}
          <strong className="text-gray-100">DucoArt</strong>, the same is{" "}
          <strong className="text-gray-100">not refundable</strong>.
        </p>
      </div>
    </div>
  );
}
