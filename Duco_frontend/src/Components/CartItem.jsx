import QuantityControlss from "./QuantityControlss";
import PriceDisplay from "./PriceDisplay";
import { RiEyeFill } from "react-icons/ri";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { usePriceContext } from "../ContextAPI/PriceContext";
import { CartContext } from "../ContextAPI/CartContext";
import { getproductssingle } from "../Service/APIservice";
import { toast } from "react-toastify";
import menstshirt from "../assets/men_s_white_polo_shirt_mockup-removebg-preview.png";
import { API_BASE_URL } from "../config/api";

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}){1,2}$/i;

const normalizeText = (value) => String(value || '').trim().toLowerCase();

// ✅ Check if image is blank (data URL < 5KB)
const isBlankImage = (src) => {
  if (!src) return true;
  if (typeof src !== 'string') return true;
  if (src.startsWith('data:') && src.length < 5000) return true;
  return false;
};

const resolveItemColorCode = (item) => {
  const raw = item?.color;
  if (HEX_COLOR_RE.test(raw)) return raw;

  // Some cart items may store a separate colorCode
  if (HEX_COLOR_RE.test(item?.colorCode)) return item.colorCode;

  // Try to resolve from product image_url entries (they contain color + colorcode)
  const desiredName = normalizeText(raw);
  const imageUrls = Array.isArray(item?.image_url) ? item.image_url : [];
  const match = imageUrls.find((img) => normalizeText(img?.color) === desiredName);

  const candidate = match?.colorcode || match?.colorCode;
  if (HEX_COLOR_RE.test(candidate)) return candidate;

  // Handle hex without leading '#'
  const trimmed = String(candidate || '').trim();
  if (/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return `#${trimmed}`;

  // Fallback: whatever was stored (can still be a valid CSS color like 'white')
  return raw;
};

const CartItem = ({ item, removeFromCart, updateQuantity }) => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [displayImage, setDisplayImage] = useState(null);
  const [productData, setProductData] = useState(null);
  const { toConvert, priceIncrease } = usePriceContext();
  const { getPreviewImages } = useContext(CartContext);

  // ✅ Fetch product data on mount to get stock info
  useEffect(() => {
    const fetchProduct = async () => {
      if (!item.id) {
        console.warn(`⚠️ CartItem: No item.id for ${item.products_name || item.name}`);
        return;
      }
      
      // ✅ For designed T-shirts: Use the image_url already included in the item instead of fetching
      if (item.id && String(item.id).startsWith('custom-tshirt-')) {
        console.log(`✅ Using image_url from designed T-shirt item: ${item.id}`);
        // Set productData from the item's image_url (already included from TShirtDesigner)
        if (item.image_url && Array.isArray(item.image_url) && item.image_url.length > 0) {
          setProductData({ image_url: item.image_url });
          console.log(`✅ Product data (image_url) loaded for designed T-shirt`, {
            imageUrlLength: item.image_url.length,
            colors: item.image_url.map(c => ({ color: c.color, colorcode: c.colorcode, hasContent: !!c.content }))
          });
        } else {
          console.warn(`⚠️ Designed T-shirt missing image_url: ${item.id}`);
          setProductData({ image_url: [] });
        }
        return;
      }
      
      console.log(`🔄 Fetching product data for: ${item.products_name || item.name} (ID: ${item.id})`);
      
      try {
        const data = await getproductssingle(item.id);
        const p = Array.isArray(data) ? data[0] : data;
        setProductData(p);
        console.log(`✅ Product data loaded for ${item.id}:`, {
          productName: p?.products_name,
          hasImageUrl: !!p?.image_url,
          imageUrlLength: p?.image_url?.length,
          colors: p?.image_url?.map(c => ({ 
            color: c.color, 
            colorcode: c.colorcode, 
            hasContent: !!c.content,
            contentLength: c.content?.length,
            stockData: c.content?.map(s => ({ size: s.size, stock: s.minstock }))
          }))
        });
      } catch (err) {
        console.error(`❌ Failed to fetch product stock for ${item.id}:`, err.message);
        // ✅ Set empty product data to prevent infinite loading
        setProductData({ image_url: [] });
      }
    };
    fetchProduct();
  }, [item.id, item.image_url]);

  const normalizeSize = (value) => {
    const raw = String(value || "").trim().toUpperCase();
    const cleaned = raw.replace(/\s+/g, "").replace(/-/g, "");
    if (["XXL", "2XL", "2X"].includes(cleaned)) return "2XL";
    if (["XXXL", "3XL", "3X"].includes(cleaned)) return "3XL";
    return cleaned;
  };

  const getSizeStockLimit = (sizeLabel) => {
    // ✅ B2B/Corporate orders: Allow high stock (no inventory constraints)
    if (item.isCorporate === true) {
      console.log(`🏢 B2B item - returning high stock limit (9999) for ${sizeLabel}`);
      return 9999;
    }
    
    // ✅ CRITICAL FIX: While loading, return null to disable increment
    if (!productData) {
      console.warn(`⚠️ CartItem: productData not loaded yet for ${item.products_name || item.name} - BLOCKING increment`);
      return null; // Return null to disable + button while loading
    }

    if (!item.color) {
      console.warn(`⚠️ CartItem: item.color is missing for ${item.products_name || item.name}`);
      return 100;
    }
    
    console.log(`🔍 getSizeStockLimit called for size: ${sizeLabel}, item.color: "${item.color}"`);
    
    // ✅ Normalize for matching (remove spaces, lowercase)
    const itemColorNorm = String(item.color || "").toLowerCase().trim();
    
    // ✅ Also check if item.color is a hex code - normalize it
    let itemColorHex = item.color;
    if (HEX_COLOR_RE.test(item.color)) {
      itemColorHex = item.color.toLowerCase();
    }
    
    console.log(`🔍 Looking for color: "${itemColorNorm}" or hex: "${itemColorHex}"`);
    console.log(`🔍 Available colors in product:`, productData.image_url?.map(c => ({
      color: c.color,
      colorcode: c.colorcode,
      contentLength: c.content?.length || 0,
      hasContent: !!c.content
    })));
    
    // ✅ Try to match by both color code AND color name
    const colorGroup = productData.image_url?.find((c) => {
      const colorCodeNorm = String(c.colorcode || "").toLowerCase().trim();
      const colorNameNorm = String(c.color || "").toLowerCase().trim();
      const matchesCode = colorCodeNorm === itemColorNorm || colorCodeNorm === itemColorHex;
      const matchesName = colorNameNorm === itemColorNorm;
      const matches = matchesCode || matchesName;
      
      if (matches) {
        console.log(`✅ MATCHED! Color group found: ${c.color} (${c.colorcode})`);
      }
      return matches;
    });
    
    if (!colorGroup) {
      console.error(`❌ CartItem: Color not found for "${itemColorNorm}". Available colors:`, 
        productData.image_url?.map(c => c.color) || []
      );
      // ✅ Return reasonable default (100) - product might still have stock
      return 100;
    }
    
    console.log(`✅ Found color group:`, { 
      color: colorGroup.color, 
      colorcode: colorGroup.colorcode, 
      contentLength: colorGroup.content?.length,
      contentStructure: colorGroup.content?.[0]
    });
    
    if (!colorGroup?.content || !Array.isArray(colorGroup.content)) {
      console.warn(`❌ CartItem: No content/stock data for color "${colorGroup.color}"`, {
        hasContent: !!colorGroup?.content,
        isArray: Array.isArray(colorGroup?.content),
        contentValue: colorGroup?.content
      });
      return 100; // No stock data = assume available stock
    }
    
    const target = normalizeSize(sizeLabel);
    const match = colorGroup.content.find(
      (c) => normalizeSize(c.size) === target
    );
    
    if (!match) {
      console.warn(`❌ CartItem: Size "${sizeLabel}" (normalized: "${target}") not found. Available:`, 
        colorGroup.content.map(c => ({ size: c.size, normalized: normalizeSize(c.size), minstock: c.minstock }))
      );
      return 100; // Size not defined = assume available stock
    }
    
    const limit = Number(match.minstock);
    const result = Number.isFinite(limit) ? Math.max(0, limit) : 0;
    console.log(`✅ CartItem: Size "${sizeLabel}" -> stock ${result}`);
    return result;
  };

  // ✅ Determine which image to display (matching selected color)
  useEffect(() => {
    let imageToDisplay = null;

    console.log('🖼️ CartItem - Determining display image:', {
      itemName: item.products_name || item.name,
      itemId: item.id,
      itemColor: item.color,
      itemColortext: item.colortext,
      hasPreviewImages: !!item.previewImages,
      previewImagesType: typeof item.previewImages,
      previewImagesKeys: item.previewImages ? Object.keys(item.previewImages) : [],
      previewImagesFront: item.previewImages?.front ? `✅ ${item.previewImages.front.length} chars` : '❌ MISSING',
      isBlankFront: item.previewImages?.front ? isBlankImage(item.previewImages.front) : null,
      hasImageUrl: !!item.image_url?.[0]?.url?.[0],
      hasProductData: !!productData?.image_url,
      hasDesign: !!item.design,
      designKeys: item.design ? Object.keys(item.design) : [],
    });

    // Try preview images first (from custom T-shirt designer)
    // ✅ CRITICAL: Check if front image is valid (not "MISSING" string, not blank)
    if (item.previewImages?.front && 
        typeof item.previewImages.front === 'string' && 
        item.previewImages.front !== 'MISSING' && 
        !isBlankImage(item.previewImages.front)) {
      imageToDisplay = item.previewImages.front;
      console.log('✅ Using preview image (front)');
    }
    // ✅ Find matching color variant image
    else {
      // Try to find matching color in item.image_url or productData.image_url
      const imageUrlArray = item.image_url || productData?.image_url || [];
      const itemColor = item.color || item.colorCode || '';
      const itemColortext = item.colortext || '';
      
      // Normalize for matching
      const itemColorNorm = String(itemColor).toLowerCase().trim();
      const itemColortextNorm = String(itemColortext).toLowerCase().trim();
      
      // Find matching color variant
      const matchedColorVariant = imageUrlArray.find((variant) => {
        const variantColorCode = String(variant.colorcode || '').toLowerCase().trim();
        const variantColorName = String(variant.color || '').toLowerCase().trim();
        
        // Match by color code (hex) or color name
        const matchesCode = variantColorCode === itemColorNorm || 
                           variantColorCode === itemColorNorm.replace('#', '');
        const matchesName = variantColorName === itemColortextNorm || 
                           variantColorName === itemColorNorm;
        
        return matchesCode || matchesName;
      });
      
      if (matchedColorVariant?.url?.[0]) {
        imageToDisplay = matchedColorVariant.url[0];
        console.log(`✅ Using matched color image: ${matchedColorVariant.color} (${matchedColorVariant.colorcode})`);
      }
      // Fallback to first available image
      else if (imageUrlArray?.[0]?.url?.[0]) {
        imageToDisplay = imageUrlArray[0].url[0];
        console.log('⚠️ Using first available image (color match not found)');
      }
      // Fallback to base T-shirt mockup
      else if (item.previewImages?.front) {
        // Even if blank, use it but with fallback styling
        imageToDisplay = item.previewImages.front;
        console.log('⚠️ Using blank preview image (fallback)');
      }
      // Final fallback to default T-shirt
      else {
        imageToDisplay = menstshirt;
        console.log('⚠️ Using default T-shirt mockup');
      }
    }

    setDisplayImage(imageToDisplay);
  }, [item, productData]);

  // ✅ Apply location pricing to a base price
  const applyLocationPricing = (basePrice, priceIncrease, conversionRate) => {
    let price = Number(basePrice) || 0;
    const originalPrice = price;
    
    // Step 1: Apply percentage increase (location markup)
    if (priceIncrease && priceIncrease > 0) {
      price += (price * Number(priceIncrease)) / 100;
      console.log(`💱 Applied markup: ${originalPrice} + ${priceIncrease}% = ${price}`);
    }
    
    // Step 2: Apply currency conversion
    // ✅ CRITICAL: Only apply if conversion rate is valid and not 1
    if (conversionRate && conversionRate !== 1 && conversionRate > 0) {
      const beforeConversion = price;
      price *= conversionRate;
      console.log(`💱 Applied conversion: ${beforeConversion} × ${conversionRate} = ${price}`);
    } else {
      console.log(`⚠️ Conversion NOT applied: rate=${conversionRate}, isValid=${conversionRate && conversionRate !== 1 && conversionRate > 0}`);
    }
    
    // ✅ Don't round here - keep precision for calculations
    return price;
  };

  // ✅ Calculate total price with location pricing applied
  const totalPrice = Object.entries(item.quantity || {}).reduce(
    (acc, [size, qty]) => {
      // Check if item is a loaded design (already has location pricing applied)
      const isLoadedDesign = item.isLoadedDesign === true;
      // Check if item is from TShirtDesigner (custom item with already applied pricing)
      const isCustomItem = item.id && item.id.startsWith('custom-tshirt-');
      
      let basePrice = 0;
      let finalPrice = 0;
      
      if (isLoadedDesign || isCustomItem) {
        // Loaded designs and custom items: use item.price as it's already converted
        basePrice = Number(item.price) || 0;
        
        // ✅ CRITICAL FIX: Re-apply conversion if toConvert is now available but wasn't when item was added
        // This handles the case where user added item before conversion rate was fetched
        if (toConvert && toConvert !== 1 && toConvert > 0) {
          // Check if price looks like it hasn't been converted yet (too high for target currency)
          // If item.price is > 100 and toConvert < 0.1, it's likely not converted
          if (basePrice > 100 && toConvert < 0.1) {
            // This price looks like it's in INR, not the target currency
            // Re-apply conversion
            finalPrice = applyLocationPricing(basePrice, 0, toConvert); // Don't re-apply markup
            console.log(`💰 CartItem (${isLoadedDesign ? 'Loaded' : 'Custom'}) - RE-CONVERTING: ${basePrice} × ${toConvert} = ${finalPrice}`);
          } else {
            // Price looks already converted
            finalPrice = basePrice;
            console.log(`💰 CartItem (${isLoadedDesign ? 'Loaded' : 'Custom'}) - Already converted: ${finalPrice}`);
          }
        } else {
          finalPrice = basePrice;
          console.log(`💰 CartItem (${isLoadedDesign ? 'Loaded' : 'Custom'}) - No conversion needed: ${finalPrice}, toConvert: ${toConvert}`);
        }
      } else {
        // Regular products: use pricing array for base INR price
        if (item.pricing && Array.isArray(item.pricing) && item.pricing.length > 0) {
          basePrice = Number(item.pricing[0]?.price_per) || 0;
        } else if (item.price) {
          basePrice = Number(item.price) || 0;
        }
        
        // Apply location pricing to base INR price
        finalPrice = applyLocationPricing(basePrice, priceIncrease, toConvert);
        console.log(`💰 CartItem (Regular): ${item.products_name || item.name} - Base: ${basePrice}, After pricing: ${finalPrice}, Qty: ${qty}, toConvert: ${toConvert}, priceIncrease: ${priceIncrease}`);
      }
      
      const itemTotal = qty * finalPrice;
      console.log(`💰 CartItem Total: ${item.products_name || item.name} - Size: ${size}, Qty: ${qty}, UnitPrice: ${finalPrice}, ItemTotal: ${itemTotal}`);
      
      return acc + itemTotal;
    },
    0
  );
  
  // ✅ Debug: Log final total price
  console.log(`💰 CartItem FINAL Total for ${item.products_name || item.name}: ${totalPrice}`);

  return (
    <div className="border-b border-gray-800 pb-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
        {/* Product Image */}
        <div className="w-full sm:w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg overflow-hidden shadow-md">
          <img
            src={displayImage || menstshirt}
            alt={item.products_name || item.name || "Custom T-Shirt"}
            className="w-full h-full object-contain"
            onError={(e) => {
              // If image fails to load, use the default T-shirt
              e.target.src = menstshirt;
            }}
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 flex flex-col gap-1 text-white">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <h2 
              className="text-lg sm:text-xl font-semibold cursor-pointer hover:text-[#E5C870] transition-colors"
              onClick={() => item.id && navigate(`/products/${item.id}`)}
              title="Click to view product"
            >
              {item.products_name || item.name || "Custom T-Shirt"}
            </h2>
            <PriceDisplay
              price={totalPrice}
              className="text-base sm:text-lg font-bold text-[#FDC305]"
              skipConversion={true}
            />
          </div>

          <div className="text-sm text-gray-300">{item.description}</div>

          {/* ✅ Quantity Handling (multi-size display with controls) */}
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            {item.quantity && typeof item.quantity === "object" ? (
              Object.entries(item.quantity).filter(([_, count]) => count > 0).length > 0 ? (
                <>
                  {Object.entries(item.quantity).map(([size, count]) => {
                    const stockLimit = getSizeStockLimit(size);
                    const exceedsStock = typeof stockLimit === "number" && count > stockLimit;
                    return count > 0 ? (
                      <div key={size} className={`flex items-center gap-2 ${exceedsStock ? "opacity-60" : ""}`}>
                        <span className={`px-2 py-1 text-xs rounded border ${
                          exceedsStock 
                            ? "bg-red-900/40 border-red-600 text-red-300" 
                            : "bg-gray-800 text-white"
                        }`}>
                          {size} × {count}
                          {exceedsStock && ` (Max: ${stockLimit})`}
                        </span>
                        <div className="flex items-center gap-1 border px-1 rounded-md bg-gray-700 text-white">
                          <button
                            onClick={() => {
                              const newQty = { ...item.quantity };
                              newQty[size] = Math.max(0, count - 1);
                              updateQuantity(newQty);
                            }}
                            className="text-sm px-2 hover:text-red-500 transition"
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="text-xs font-semibold">{count}</span>
                          <button
                            onClick={() => {
                              const stockLimit = getSizeStockLimit(size);
                              const newQty = count + 1;
                              
                              console.log(`➕ + button clicked for ${size}: current=${count}, limit=${stockLimit}, willBe=${newQty}`);
                              
                              // ✅ CRITICAL FIX: Block if stock data not loaded yet
                              if (stockLimit === null) {
                                toast.error('Loading stock data, please wait...');
                                return;
                              }
                              
                              // Block increment if stock limit is 0 or exceeded
                              if (typeof stockLimit === "number" && newQty > stockLimit) {
                                if (stockLimit === 0) {
                                  toast.error(`No stock available for size ${size}`);
                                } else {
                                  const remaining = Math.max(0, stockLimit - count);
                                  toast.error(`Only ${remaining} ${remaining === 1 ? 'item' : 'items'} left for ${size}`);
                                }
                                return;
                              }
                              
                              const newQtyObj = { ...item.quantity };
                              newQtyObj[size] = newQty;
                              updateQuantity(newQtyObj);
                            }}
                            className="text-sm px-2 hover:text-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Increase quantity"
                            disabled={(() => {
                              const stockLimit = getSizeStockLimit(size);
                              // ✅ CRITICAL FIX: Disable if stock data not loaded OR if at/over limit
                              if (stockLimit === null) {
                                console.log(`🚫 + button DISABLED for ${size}: stock data loading`);
                                return true;
                              }
                              const isDisabled = typeof stockLimit === "number" && count >= stockLimit;
                              if (isDisabled) {
                                console.log(`🚫 + button DISABLED for ${size}: count=${count}, limit=${stockLimit}`);
                              }
                              return isDisabled;
                            })()}
                          >
                            +
                          </button>
                        </div>
                        {/* Stock indicator */}
                        {(() => {
                          const maxStock = getSizeStockLimit(size);
                          if (maxStock !== null && maxStock !== undefined && maxStock <= 10) {
                            return (
                              <span className={`text-xs ${maxStock === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                                {maxStock === 0 ? '❌ Out of stock' : `⚠️ Only ${maxStock} left`}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : null;
                  })}
                </>
              ) : (
                <span className="px-2 py-1 text-xs rounded border">
                  Qty: 1
                </span>
              )
            ) : (
              <span className="px-2 py-1 text-xs rounded border">
                Qty: 1
              </span>
            )}
          </div>

          <div className="flex gap-4 mt-2 flex-wrap text-sm text-gray-400">
            <p className="flex items-center">
              <span className="text-white font-medium mr-1">Color:</span>
              <span
                className="inline-block w-4 h-4 rounded-full border border-white"
                style={{ backgroundColor: resolveItemColorCode(item) || item.color }}
              ></span>
            </p>
            <p>
              <span className="text-white font-medium">Gender:</span>{" "}
              {item?.gender}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            {/* Design Preview - Only show if item has design */}
            {/* ✅ Only show Preview button if there are actual preview images OR design content OR additional files */}
            {((item.previewImages && Object.values(item.previewImages).some(img => img && img !== 'MISSING' && !isBlankImage(img))) || 
              (item.design && Object.values(item.design).some(side => side?.uploadedImage || side?.customText)) ||
              (Array.isArray(item.additionalFilesMeta) && item.additionalFilesMeta.length > 0)) && (
              <button
                onClick={() => {
                  console.log('🖼️ Preview button clicked - item data:', {
                    itemId: item.id,
                    hasPreviewImages: !!item.previewImages,
                    previewImages: item.previewImages ? {
                      front: item.previewImages.front ? `${item.previewImages.front.substring(0, 50)}... (${item.previewImages.front.length} chars)` : 'MISSING',
                      back: item.previewImages.back ? `${item.previewImages.back.substring(0, 50)}... (${item.previewImages.back.length} chars)` : 'MISSING',
                      left: item.previewImages.left ? `${item.previewImages.left.substring(0, 50)}... (${item.previewImages.left.length} chars)` : 'MISSING',
                      right: item.previewImages.right ? `${item.previewImages.right.substring(0, 50)}... (${item.previewImages.right.length} chars)` : 'MISSING',
                    } : 'NO PREVIEW IMAGES',
                    hasAdditionalFiles: !!item.additionalFilesMeta,
                    filesCount: item.additionalFilesMeta?.length || 0,
                  });
                  
                  // ✅ Use preview images directly from item (now stored in cart)
                  if (item.previewImages) {
                    const previews = [
                      (item.previewImages.front && item.previewImages.front !== 'MISSING' && !isBlankImage(item.previewImages.front)) ? { url: item.previewImages.front, view: 'Front' } : null,
                      (item.previewImages.back && item.previewImages.back !== 'MISSING' && !isBlankImage(item.previewImages.back)) ? { url: item.previewImages.back, view: 'Back' } : null,
                      (item.previewImages.left && item.previewImages.left !== 'MISSING' && !isBlankImage(item.previewImages.left)) ? { url: item.previewImages.left, view: 'Left' } : null,
                      (item.previewImages.right && item.previewImages.right !== 'MISSING' && !isBlankImage(item.previewImages.right)) ? { url: item.previewImages.right, view: 'Right' } : null,
                    ].filter(Boolean); // Filter out null values
                    
                    console.log('🖼️ Previews array after filter:', previews.map(p => ({ view: p.view, urlLength: p.url.length })));
                    if (previews.length > 0) {
                      setPreviewImage(previews);
                    } else if (Array.isArray(item.additionalFilesMeta) && item.additionalFilesMeta.length > 0) {
                      setPreviewImage([]);
                    } else {
                      setPreviewImage(null);
                    }
                  } else if (Array.isArray(item.design)) {
                    // Array format
                    setPreviewImage(item.design);
                  } else if (item.design && typeof item.design === 'object') {
                    // Object format - convert to array
                    const previews = [];
                    if (item.design.front?.uploadedImage || item.design.front?.customText) {
                      previews.push({ url: item.design.frontImage || item.design.front.uploadedImage, view: 'Front' });
                    }
                    if (item.design.back?.uploadedImage || item.design.back?.customText) {
                      previews.push({ url: item.design.backImage || item.design.back.uploadedImage, view: 'Back' });
                    }
                    if (item.design.left?.uploadedImage || item.design.left?.customText) {
                      previews.push({ url: item.design.leftImage || item.design.left.uploadedImage, view: 'Left' });
                    }
                    if (item.design.right?.uploadedImage || item.design.right?.customText) {
                      previews.push({ url: item.design.rightImage || item.design.right.uploadedImage, view: 'Right' });
                    }
                    setPreviewImage(previews.length > 0 ? previews : null);
                  } else {
                    // ✅ If only additional files exist (PDF/CDR), still open modal
                    if (Array.isArray(item.additionalFilesMeta) && item.additionalFilesMeta.length > 0) {
                      setPreviewImage([]);
                    } else {
                      setPreviewImage(null);
                    }
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E5C870] text-black text-sm rounded-md hover:bg-gray-800 hover:text-white transition"
              >
                <RiEyeFill size={18} />
                Preview
              </button>
            )}

            {/* Remove Button */}
            <button
              onClick={removeFromCart}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100 transition"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16m-4 0V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>

      {previewImage !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full relative overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-black mb-4">Design Preview</h2>
            
            {/* ✅ T-Shirt Design Previews */}
            {Array.isArray(previewImage) && previewImage.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {previewImage.map((img, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={img.url}
                        alt={`${img.view} View`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = '/fallback.png';
                          e.target.alt = 'Preview not available';
                        }}
                      />
                    </div>
                    <span className="text-black font-semibold text-sm uppercase tracking-wide">
                      {img.view} View
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 mb-8">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 font-medium text-lg">No design preview available</p>
                <p className="text-gray-500 text-sm mt-2">This is a plain t-shirt without custom design</p>
              </div>
            )}

            {/* ✅ Additional Files (PDF/CDR) */}
            {item.additionalFilesMeta && item.additionalFilesMeta.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-black mb-4">📎 Additional Files (CDR/PDF)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {item.additionalFilesMeta.map((file, index) => (
                    <div key={index} className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-300">
                      {/* File Icon */}
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        {file.type?.includes('pdf') ? (
                          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                            <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-xs font-bold fill-red-600">PDF</text>
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                            <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-xs font-bold fill-blue-600">CDR</text>
                          </svg>
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="text-center flex-1">
                        <p className="text-black font-semibold text-sm truncate max-w-xs" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Size unknown'}
                        </p>
                      </div>
                      
                      {/* Download Button */}
                      <a
                        href={file.dataUrl}
                        download={file.name}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition text-center font-medium"
                      >
                        ⬇️ Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartItem;
