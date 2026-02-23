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
      
      // ✅ CRITICAL: Restore preview images from localStorage
      // They ARE saved in localStorage, so restore them to memory reference
      savedCart.forEach(item => {
        if (item.previewImages) {
          previewImagesRef.current[item.id] = item.previewImages;
        }
      });
      
      setCart(savedCart);
      
      console.log("🧩 Cart loaded from localStorage:", {
        itemCount: savedCart.length,
        itemsWithPreviewImages: savedCart.filter(i => !!i.previewImages).length,
        items: savedCart.map(i => ({
          id: i.id,
          name: i.name,
          hasPreviewImages: !!i.previewImages,
          hasFiles: !!i.additionalFilesMeta?.length
        }))
      });
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
    
    // ✅ CRITICAL: Store preview images in memory reference for all items
    cart.forEach(item => {
      if (item.previewImages) {
        previewImagesRef.current[item.id] = item.previewImages;
      }
    });
    
    // ✅ CRITICAL FIX: Keep BOTH design object AND previewImages in localStorage
    // Both are needed for proper order processing:
    // - design: needed for countDesignSides() to calculate printing charges
    // - previewImages: needed for design preview modal and Cloudinary upload
    const cartForStorage = cart.map(item => {
      // Keep everything - design, previewImages, additionalFilesMeta
      return item;
    });
    
    try {
      localStorage.setItem("cart", JSON.stringify(cartForStorage));
      console.log("🛒 Cart saved to localStorage:", {
        itemCount: cartForStorage.length,
        itemsWithDesign: cart.filter(i => !!i.design || !!i.additionalFilesMeta?.length).length,
        itemsWithPreviewImages: cart.filter(i => !!i.previewImages).length,
        itemsWithData: cartForStorage.map(i => ({
          id: i.id,
          name: i.name,
          hasDesign: !!i.design,
          hasPreviewImages: !!i.previewImages,
          hasFiles: !!i.additionalFilesMeta?.length
        }))
      });
    } catch (err) {
      console.error("❌ Failed to save cart to localStorage:", err);
      // If still too large, try removing preview images only
      if (err.name === 'QuotaExceededError') {
        console.warn("⚠️ Cart too large, removing preview images from storage...");
        const minimalCart = cart.map(item => {
          const { previewImages, ...itemWithoutPreviewImages } = item;
          // ✅ KEEP design object - it's critical for printing charges
          return itemWithoutPreviewImages;
        });
        try {
          localStorage.setItem("cart", JSON.stringify(minimalCart));
          console.log("🛒 Cart saved with minimal data (design kept, preview images removed)");
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

    // ✅ B2B/B2C CONFLICT CHECK
    if (cart.length > 0) {
      const cartItemIsB2B = cart[0]?.isCorporate === true;
      const newProductIsB2B = product.isCorporate === true;
      
      if (cartItemIsB2B !== newProductIsB2B) {
        // Conflict detected - show confirmation
        const cartType = cartItemIsB2B ? 'Wholesale (B2B)' : 'Retail (B2C)';
        const productType = newProductIsB2B ? 'Wholesale (B2B)' : 'Retail (B2C)';
        
        const confirmed = window.confirm(
          `Your cart contains a different product type (${cartType}). You cannot mix Wholesale (B2B) and Retail (B2C). Do you want to clear your current cart and add this ${productType} item?`
        );
        
        if (!confirmed) {
          return; // User clicked Cancel - do nothing
        }
        
        // User clicked OK - clear cart and continue adding
        clearCart();
      }
    }

    // ✅ Store preview images in memory before adding to cart
    if (product.previewImages) {
      previewImagesRef.current[product.id] = product.previewImages;
      console.log("💾 Preview images stored in memory for:", product.id, {
        front: product.previewImages.front ? `${product.previewImages.front.substring(0, 50)}... (${product.previewImages.front.length} chars)` : 'MISSING',
        back: product.previewImages.back ? `${product.previewImages.back.substring(0, 50)}... (${product.previewImages.back.length} chars)` : 'MISSING',
        left: product.previewImages.left ? `${product.previewImages.left.substring(0, 50)}... (${product.previewImages.left.length} chars)` : 'MISSING',
        right: product.previewImages.right ? `${product.previewImages.right.substring(0, 50)}... (${product.previewImages.right.length} chars)` : 'MISSING',
      });
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
        // ✅ CRITICAL: Include preview images and files in the cart item
        previewImages: product.previewImages || null,
        additionalFilesMeta: product.additionalFilesMeta || [],
        printroveProductId: product.printroveProductId || null,
        printroveVariantId: product.printroveVariantId || null,
      };

      console.log("🧾 Added to cart:", {
        id: finalData.id,
        name: finalData.name,
        hasPreviewImages: !!finalData.previewImages,
        previewImagesFront: finalData.previewImages?.front ? `${finalData.previewImages.front.substring(0, 50)}... (${finalData.previewImages.front.length} chars)` : 'MISSING',
        hasAdditionalFiles: finalData.additionalFilesMeta?.length > 0,
        filesCount: finalData.additionalFilesMeta?.length || 0,
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

  const removeFromCart = (id, quantity = null, color = null, design = null) => {
    setCart((prev) => prev.filter((item) => {
      // ✅ Match by id AND color (if color is provided)
      if (color) {
        return !(item.id === id && item.color === color);
      }
      // ✅ Fallback: remove by id only (for non-color items)
      return item.id !== id;
    }));
    
    // ✅ Remove preview images from memory
    // Note: Only delete if no other variants with same base id exist
    if (color) {
      const itemKey = `${id}-${color}`;
      delete previewImagesRef.current[itemKey];
    } else {
      delete previewImagesRef.current[id];
    }
  };

  const clearCart = () => {
    setCart([]);
    previewImagesRef.current = {};
    localStorage.removeItem("cart");
  };

  // ✅ Update quantity for a specific variant (productId + color)
  const updateQuantity = (productId, sizeQty, color = null) => {
    setCart((prev) => {
      console.log(`🔄 updateQuantity called:`, {
        productId,
        color,
        sizeQty,
        currentCartItems: prev.map(i => ({
          id: i.id,
          color: i.color,
          colorcode: i.colorcode,
          quantity: i.quantity
        }))
      });
      
      return prev.map((item) => {
        // ✅ Match by productId AND color (if color provided)
        const matchesId = item.id === productId || item._id === productId;
        
        if (!matchesId) return item;
        
        // ✅ If no color specified, match only by ID (backward compatibility)
        if (color === null) {
          console.warn(`⚠️ updateQuantity: No color provided for ${productId}, updating all variants (backward compatibility)`);
          return { ...item, quantity: sizeQty };
        }
        
        // ✅ Normalize colors for comparison (case-insensitive, handle hex codes)
        const normalizeColor = (c) => {
          if (!c) return '';
          const str = String(c).trim().toLowerCase();
          // Normalize hex codes (remove #, ensure lowercase)
          if (str.startsWith('#')) return str;
          if (/^[0-9a-f]{6}$/i.test(str)) return `#${str}`;
          return str;
        };
        
        const itemColor = normalizeColor(item.color);
        const itemColorCode = normalizeColor(item.colorcode);
        const targetColor = normalizeColor(color);
        
        const matchesColor = itemColor === targetColor || itemColorCode === targetColor;
        
        if (matchesColor) {
          console.log(`✅ updateQuantity: Matched item ${item.id} (${item.products_name || item.name}) with color ${item.color || item.colorcode}`);
          return { ...item, quantity: sizeQty };
        } else {
          console.log(`⏭️ updateQuantity: Skipped item ${item.id} - color mismatch (item: ${item.color || item.colorcode}, target: ${color})`);
        }
        
        return item;
      });
    });
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
