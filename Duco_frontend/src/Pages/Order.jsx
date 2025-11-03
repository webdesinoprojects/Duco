import React, { useState, useEffect } from "react";
import OrderCart from "../Components/OrderCart";
import { FaShoppingBag, FaSync } from "react-icons/fa";
import BoxOfProdcuts from "../Components/BoxOfProdcuts";
import { fetchOrdersByUser } from "../Service/APIservice";
import { getUserOrdersWithTracking, bulkSyncOrderStatuses } from "../Service/trackingApi";

import watchphoto from "../assets/gloomy-young-black-model-clean-white-unlabeled-cotton-t-shirt-removebg-preview.png";

const sampleProduct = {
  id: "1",
  name: "Noise Icon '2.1' Display with Bluetooth Calling",
  image: watchphoto,
};

const Order = () => {
  const [order, setOrder] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?._id) return;
      try {
        setLoading(true);
        // Try to get enhanced tracking data first
        try {
          const trackingOrders = await getUserOrdersWithTracking(user._id);
          console.log("User Orders with Tracking:", trackingOrders);
          setOrder(trackingOrders.orders || []);
        } catch (trackingError) {
          console.warn("Enhanced tracking failed, falling back to basic orders:", trackingError);
          // Fallback to basic order fetch
          const orders = await fetchOrdersByUser(user._id);
          console.log("User Orders (fallback):", orders);
          setOrder(orders.data || orders);
        }
      } catch (error) {
        console.error("Error loading orders:", error);
        setOrder([]);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [user]);

  const handleSyncAll = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      await bulkSyncOrderStatuses();
      // Reload orders after sync
      if (user?._id) {
        const trackingOrders = await getUserOrdersWithTracking(user._id);
        setOrder(trackingOrders.orders || []);
      }
    } catch (error) {
      console.error("Bulk sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full p-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5C870] mx-auto mb-4"></div>
            <p>Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-10">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FaShoppingBag
            size={40}
            className="text-white text-xl cursor-pointer"
          />
          <div>
            <h1 className="text-white text-2xl font-bold">My Orders</h1>
            <p className="text-gray-400 text-sm">{order.length} orders found</p>
          </div>
        </div>
        
        {order.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#E5C870] text-black rounded-lg hover:bg-[#d4b863] transition-colors disabled:opacity-50"
          >
            <FaSync className={`${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
        )}
      </div>

      {order.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <FaShoppingBag size={60} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
          <p>Your orders will appear here once you make a purchase.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {order.map((o) => (
            <OrderCart key={o._id} order={o} />
          ))}
        </div>
      )}

      <section className="mt-5">
        <div>
          <h3 className="text-start font-bold text-white text-2xl">
            Related Products
          </h3>

          <div className="mt-5 overflow-x-auto  scrollbar-none [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-4 w-max">
              <BoxOfProdcuts />
              <BoxOfProdcuts />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Order;
