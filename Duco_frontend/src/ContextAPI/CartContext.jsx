import React, { createContext, useState, useEffect, useContext } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  
  // ✅ Store preview images in memory (not in localStorage due to size)
  const previewImagesRef = React.useRef({});

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
    
    // ✅ Strip preview images before storing in localStorage (they're too large)
    const cartForStorage = cart.map(item => {
      const { previewImages, ...itemWithoutPreview } = item;
      return itemWithoutPreview;
    });
    
    try {
      localStorage.setItem("cart", JSON.stringify(cartForStorage));
      console.log("🛒 Cart saved to localStorage (preview images excluded)");
    } catch (err) {
      console.error("❌ Failed to save cart to localStorage:", err);
      // If still too large, try removing design data too
      if (err.name === 'QuotaExceededError') {
        console.warn("⚠️ Cart too large even without preview images, removing design data...");
        const minimalCart = cartForStorage.map(item => {
          const { design, ...itemWithoutDesign } = item;
          return itemWithoutDesign;
        });
        try {
          localStorage.setItem("cart", JSON.stringify(minimalCart));
          console.log("🛒 Cart saved with minimal data");
        } catch (err2) {
          console.error("❌ Failed to save even minimal cart:", err2);
        }
      }
    }
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

    // ✅ Store preview images in memory before adding to cart
    if (product.previewImages) {
      previewImagesRef.current[product.id] = product.previewImages;
      console.log("💾 Preview images stored in memory for:", product.id);
    }

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
    // ✅ Also remove preview images from memory
    delete previewImagesRef.current[id];
  };

  const clearCart = () => {
    setCart([]);
    previewImagesRef.current = {};
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

  // ✅ Get preview images from memory
  const getPreviewImages = (itemId) => {
    return previewImagesRef.current[itemId] || null;
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
        getPreviewImages,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ✅ custom hook (now works since useContext is imported)
export const useCart = () => useContext(CartContext);
