import React, { createContext, useState, useEffect, useContext } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // ✅ Load from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
      console.log("🧩 Cart loaded from localStorage:", savedCart);
    } catch (err) {
      console.warn("⚠️ Failed to parse localStorage cart:", err);
      localStorage.removeItem("cart");
    } finally {
      setHydrated(true);
    }
  }, []);

  // ✅ Save to localStorage only after hydration
  useEffect(() => {
    if (!hydrated) return;
    console.log("🛒 Cart updated:", cart); // ✅ log full cart every time it changes
    localStorage.setItem("cart", JSON.stringify(cart));
    console.log("🛒 Cart updated:", cart);
  }, [cart, hydrated]);

  // ✅ Merge size quantities safely
  const mergeQuantities = (oldQty, newQty) => {
    const merged = { ...oldQty };
    for (let size in newQty) {
      merged[size] = (merged[size] || 0) + (newQty[size] || 0);
    }
    return merged;
  };

  // ✅ Add product (preserves all fields)
  const addToCart = (product) => {
    if (!product) return console.error("❌ Invalid product to add:", product);

    const exists = cart.find(
      (item) =>
        item.id === product.id &&
        item.color === product.color &&
        JSON.stringify(item.design) === JSON.stringify(product.design)
    );

    if (exists) {
      // merge qty
      setCart((prev) =>
        prev.map((item) =>
          item.id === product.id && item.color === product.color
            ? {
                ...item,
                quantity: mergeQuantities(item.quantity, product.quantity),
              }
            : item
        )
      );
    } else {
      const finalData = {
        ...product,
        printroveProductId: product.printroveProductId || null,
        printroveVariantId: product.printroveVariantId || null,
      };

      console.log("🧾 Added to cart:", finalData);
      console.log("✅ Check IDs →", {
            printroveProductId: finalData.printroveProductId,
            printroveVariantId: finalData.printroveVariantId,
});

      // ✅ Check Printrove mapping status
      const hasPrintroveProductId = !!finalData.printroveProductId;
      const hasVariantMappings = finalData.printroveLineItems?.some(item => item.printroveVariantId);
      const mappedSizesCount = finalData.printroveLineItems?.filter(item => item.printroveVariantId)?.length || 0;
      const totalSizesCount = finalData.printroveLineItems?.length || 0;

      if (!hasPrintroveProductId && !hasVariantMappings) {
        console.info("ℹ️ Cart item added without Printrove mappings - backend will handle fallback:", {
          productName: finalData.name,
          productId: finalData.productId,
          needsFallback: true
        });
      } else if (mappedSizesCount < totalSizesCount) {
        console.info(`ℹ️ Cart item partially mapped: ${mappedSizesCount}/${totalSizesCount} sizes have variant IDs`);
      } else {
        console.log("✅ Cart item fully mapped with Printrove IDs");
      }

      setCart((prev) => [...prev, finalData]);
    }
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const updateQuantity = (productId, sizeQty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId || item._id === productId
          ? { ...item, quantity: sizeQty }
          : item
      )
    );
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        hydrated,
        addToCart,
        setCart,
        removeFromCart,
        clearCart,
        updateQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ✅ custom hook (now works since useContext is imported)
export const useCart = () => useContext(CartContext);
