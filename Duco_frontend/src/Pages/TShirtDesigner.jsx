// FULL MULTI-VIEW DESIGNER — Responsive for mobile
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
} from "react";
import { CartContext } from "../ContextAPI/CartContext";
import { toPng } from "html-to-image";
// DndKit removed - using custom drag implementation
import { MdNavigateNext } from "react-icons/md";
import menstshirt from "../assets/men_s_white_polo_shirt_mockup-removebg-preview.png";
import axios from "axios";
import { createDesign, getproductssingle } from "../Service/APIservice";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaUpload, FaFont, FaRegKeyboard, FaTimes } from "react-icons/fa";
import { startFreshDesignSession } from "../utils/clearOrderCache";
import { usePriceContext } from "../ContextAPI/PriceContext";

// ======================== SIMPLE DRAGGABLE ITEM ========================
const CustomDraggableItem = React.memo(({ id, children, position = { x: 0, y: 0 }, onPositionChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState(position);
  const elementRef = useRef(null);

  // Update current position when prop changes
  useEffect(() => {
    setCurrentPos(position);
  }, [position]);

  const handleMouseDown = useCallback((e) => {
    console.log(`🎯 Drag start: ${id}`);
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  }, [id]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    // Get the T-shirt container (the main design area)
    const container = elementRef.current?.closest('.design-area-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    
    // Convert pixel movement to percentage
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    // Calculate new position with constraints
    const newPos = {
      x: Math.max(10, Math.min(90, position.x + deltaXPercent)),
      y: Math.max(10, Math.min(90, position.y + deltaYPercent)),
    };
    
    setCurrentPos(newPos);
  }, [isDragging, startPos, position]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    console.log(`🎯 Drag end: ${id} -> x:${currentPos.x.toFixed(1)}, y:${currentPos.y.toFixed(1)}`);
    
    // Update the actual position in parent state
    onPositionChange(id, currentPos);
    setIsDragging(false);
  }, [isDragging, id, currentPos, onPositionChange]);

  // Global mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const style = {
    position: "absolute",
    left: `${currentPos.x}%`,
    top: `${currentPos.y}%`,
    transform: "translate(-50%, -50%)",
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 100 : 50, // Normal z-index
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    WebkitUserDrag: "none",
    pointerEvents: "auto",
  };

  return (
    <div 
      ref={elementRef}
      style={style} 
      onMouseDown={handleMouseDown}
      className="custom-draggable-item"
    >
      {children}
    </div>
  );
});

// ======================== MAIN COMPONENT ========================
const TshirtDesigner = () => {
  const { addToCart, clearCart } = useContext(CartContext);
  const { priceIncrease, toConvert: conversionRate, currency, resolvedLocation } = usePriceContext();
  const [isSaving, setIsSaving] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [side, setSide] = useState("front");
  const [sideimage, setSideimage] = useState([]);
  const [activeTab, setActiveTab] = useState("none");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  const views = ["front", "back", "left", "right"];

  // ✅ Apply location-based pricing to a base price
  const applyLocationPricing = (basePrice, priceIncrease, conversionRate) => {
    let price = Number(basePrice) || 0;
    
    // Step 1: Apply percentage increase (location markup)
    if (priceIncrease) {
      price += (price * Number(priceIncrease)) / 100;
    }
    
    // Step 2: Apply currency conversion
    if (conversionRate && conversionRate !== 1) {
      price *= conversionRate;
    }
    
    return Math.round(price);
  };

  // Custom drag system - no sensors needed

  // ✅ get passed size quantities from ProductPage
  const location = useLocation();
  const passedQuantity = location.state?.quantity || {
    S: 0,
    M: 1,
    L: 0,
    XL: 0,
    "2XL": 0,
    "3XL": 0,
  };

  const defaultSideState = (view) => {
    // Center position for all elements on all views - adjusted for T-shirt area
    const centerPos = { x: 50, y: 45 }; // More centered on actual T-shirt chest area
    
    return {
      uploadedImage: null,
      customText: "",
      textSize: 20,
      textColor: "#000000",
      font: "font-sans",
      imageSize: 120,
      positions: {
        [`uploaded-image-${view}`]: centerPos, // Logo/image in center
        [`custom-text-${view}`]: centerPos,    // Text in center
      },
    };
  };

  const [allDesigns, setAllDesigns] = useState({
    front: defaultSideState("front"),
    back: defaultSideState("back"),
    left: defaultSideState("left"),
    right: defaultSideState("right"),
  });

  const designRefs = {
    front: useRef(null),
    back: useRef(null),
    left: useRef(null),
    right: useRef(null),
  };

  const { proid, color } = useParams();
  const navigate = useNavigate();
  const colorWithHash = color
    ? color.startsWith("#")
      ? color
      : `#${color}`
    : "";

  // URL parameters processed
  
  // State for showing center guide
  const [showCenterGuide, setShowCenterGuide] = useState(false);
  const [cuteMessage, setCuteMessage] = useState(null);

  const getViewIndex = (s) =>
    ({ front: 0, back: 1, left: 2, right: 3 }[s] ?? 0);

  // ======================== EFFECTS ========================
  // ✅ Clear all cached order data when starting a new design session
  useEffect(() => {
    try {
      const sessionId = startFreshDesignSession();
      clearCart();
      
      // Store session ID for this design
      setAllDesigns(prev => ({
        ...prev,
        sessionId
      }));
      
      console.log("✅ Fresh design session initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing fresh design session:", error);
      // Continue without session ID if there's an error
    }
  }, []); // Run only once when component mounts

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const getdata = async () => {
      try {
        setIsLoadingProduct(true);
        const data = await getproductssingle(proid);
        console.log("PRODUCT DETAILS:", data);
        setProductDetails(data);

        const match = data?.image_url?.find(
          (e) => e.colorcode === colorWithHash
        );
        
        console.log("🎨 Color matching debug:", {
          colorWithHash,
          availableColors: data?.image_url?.map(img => img.colorcode),
          match: match,
          designtshirt: match?.designtshirt
        });
        
        const designImages = match?.designtshirt || [];
        setSideimage(designImages);
        
        // If no design images available, use default T-shirt for all views
        if (designImages.length === 0) {
          setSideimage([
            menstshirt, // front
            menstshirt, // back  
            menstshirt, // left
            menstshirt  // right
          ]);
        }
        
        // If no design images found, ensure we have at least the fallback
        if (designImages.length === 0) {
          console.log("⚠️ No design images found, using fallback T-shirt image");
        }
      } catch (e) {
        console.error("Failed to fetch product images", e);
      } finally {
        setIsLoadingProduct(false);
      }
    };
    if (proid) getdata();
  }, [proid, color, colorWithHash]);

  // ======================== HANDLERS ========================
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAllDesigns((prev) => {
        const centerPos = { x: 45, y: 55 }; // Center position on chest
        const imageId = `uploaded-image-${side}`;
        
        const result = {
          ...prev,
          [side]: { 
            ...prev[side], 
            uploadedImage: reader.result,
            // Ensure the uploaded image appears in center
            positions: {
              ...prev[side].positions,
              [imageId]: centerPos,
            }
          },
        };
        
        // Show center guide briefly when image is uploaded
        setShowCenterGuide(true);
        setTimeout(() => setShowCenterGuide(false), 2000);
        
        return result;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAdditionalFilesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setAdditionalFiles((prevFiles) => [
      ...prevFiles,
      ...files.map((file) => ({ name: file.name, file })),
    ]);
  };

  const updateCurrentDesign = (property, value) => {
    setAllDesigns((prev) => {
      const centerPos = { x: 50, y: 45 }; // Center position on T-shirt chest
      const textId = `custom-text-${side}`;
      
      // If updating custom text and it's the first time adding text, center it
      const shouldCenterText = property === 'customText' && 
                              value && 
                              !prev[side].customText;
      
      // Show center guide when text is first added
      if (shouldCenterText) {
        setShowCenterGuide(true);
        setTimeout(() => setShowCenterGuide(false), 2000);
      }

      // FIXED: Always preserve existing positions, only update when centering text
      const newPositions = shouldCenterText ? {
        ...prev[side].positions,
        [textId]: centerPos,
      } : { ...prev[side].positions }; // Create new object to avoid reference issues

      return {
        ...prev,
        [side]: { 
          ...prev[side], 
          [property]: value,
          positions: newPositions,
        },
      };
    });
  };

  // Custom drag position handler
  const handlePositionChange = useCallback((elementId, newPosition) => {
    console.log(`🎯 Position updated: ${elementId} -> x:${newPosition.x.toFixed(1)}, y:${newPosition.y.toFixed(1)}`);
    
    setAllDesigns((prev) => {
      return {
        ...prev,
        [side]: {
          ...prev[side],
          positions: {
            ...prev[side].positions,
            [elementId]: newPosition,
          },
        },
      };
    });
  }, [side]);

  // Cute message handler
  const showCuteMessage = (message, emoji = "🎉") => {
    setCuteMessage({ text: message, emoji });
    setTimeout(() => setCuteMessage(null), 4000); // Hide after 4 seconds
  };

  // ======================== HELPER: WAIT FOR IMAGES ========================
  const waitForImages = (container) => {
    const images = container.querySelectorAll("img");
    return Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve();
            else img.onload = img.onerror = resolve;
          })
      )
    );
  };

  // ======================== PRINTROVE HELPERS ========================
  const canonSize = (s) => {
    const t = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const dict = {
      XS: "XS",
      XSMALL: "XS",

      S: "S",
      SMALL: "S",

      M: "M",
      MEDIUM: "M",

      L: "L",
      LARGE: "L",

      XL: "XL",
      XLARGE: "XL",
      EXTRALARGE: "XL",

      XXL: "2XL",
      "2XL": "2XL",
      DOUBLEXL: "2XL",
      "2X": "2XL",

      XXXL: "3XL",
      "3XL": "3XL",
      TRIPLEXL: "3XL",
      "3X": "3XL",

      // chest-size fallbacks
      "38": "M",
      "40": "L",
      "42": "XL",
      "44": "2XL",
      "46": "3XL",
    };
    return dict[t] || t;
  };

  const deepFind = (obj, predicate) => {
    try {
      const stack = [obj];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== "object") continue;
        if (predicate(cur)) return cur;
        for (const v of Object.values(cur)) {
          if (v && typeof v === "object") stack.push(v);
        }
      }
    } catch {}
    return null;
  };

  const deepFindPrintroveProductId = (obj) => {
    const hit = deepFind(obj, (node) =>
      Object.keys(node).some((k) => {
        const key = k.toLowerCase();
        return (
          key.includes("printrove") &&
          key.includes("product") &&
          (typeof node[k] === "string" || typeof node[k] === "number")
        );
      })
    );
    if (!hit) return null;
    const key = Object.keys(hit).find((k) => {
      const kk = k.toLowerCase();
      return kk.includes("printrove") && kk.includes("product");
    });
    return hit ? hit[key] : null;
  };

  const extractPrintroveProductId = (details) => {
    const byColor = details?.image_url?.find((e) => e.colorcode === colorWithHash);
    return (
      details?.printrove_product_id ||
      details?.printroveProductId ||
      details?.product_mapping?.printrove_id ||
      details?.product_mapping?.printrove_product_id ||
      details?.printrove_id ||
      details?.pricing?.[0]?.printrove_product_id ||
      byColor?.printrove_product_id ||
      deepFindPrintroveProductId(details) ||
      null
    );
  };

  // build variant map from many possible shapes, including color-level objects
  const buildVariantMap = (details) => {
    const map = {};
    const upsert = (label, vid) => {
      const c = canonSize(label);
      if (!c || !vid) return;
      if (!map[c]) map[c] = vid;
    };

    const coerceList = (node) =>
      Array.isArray(node) ? node : node ? Object.values(node) : [];

    // 1) product-level variant_mapping
    coerceList(details?.variant_mapping).forEach((v) => {
      const size = v?.size ?? v?.label ?? v?.name ?? v?.Size ?? v?.s;
      const vid =
        v?.printrove_variant_id ??
        v?.printroveVariantId ??
        v?.variant_id ??
        v?.printrove_id ??
        v?.variantId ??
        null;
      upsert(size, vid);
    });
    // ✅ Fallback: if product itself has printroveVariantId or pricing[0] variant
if (!Object.keys(map).length) {
  const directVariant =
    details?.printroveVariantId ||
    details?.pricing?.[0]?.printrove_variant_id ||
    details?.pricing?.[0]?.variant_id ||
    details?.pricing?.[0]?.printroveVariantId;
  if (directVariant) {
    // default assign all canonical sizes to this variant (for single variant products)
    ["S", "M", "L", "XL", "2XL", "3XL"].forEach((s) =>
      upsert(s, directVariant)
    );
  }
}

    // 2) product-level pricing[]
    coerceList(details?.pricing).forEach((p) => {
      const size = p?.size ?? p?.label ?? p?.name ?? p?.Size;
      const vid =
        p?.printrove_variant_id ??
        p?.printroveVariantId ??
        p?.variant_id ??
        p?.printrove_id ??
        p?.variantId ??
        null;
      upsert(size, vid);
    });

    // 3) color-level (inside image_url entry for selected color)
    const colorNode =
      details?.image_url?.find((e) => e.colorcode === colorWithHash) || null;

    if (colorNode) {
      // common shapes: variant_mapping, variants, sizes, size_map, printrove_variants
      const candidates = [
        colorNode?.variant_mapping,
        colorNode?.variants,
        colorNode?.sizes,
        colorNode?.size_map,
        colorNode?.sizeMapping,
        colorNode?.printrove_variants,
      ];
      candidates.forEach((cand) => {
        coerceList(cand).forEach((v) => {
          const size = v?.size ?? v?.label ?? v?.name ?? v?.Size ?? v?.s;
          const vid =
            v?.printrove_variant_id ??
            v?.printroveVariantId ??
            v?.variant_id ??
            v?.printrove_id ??
            v?.variantId ??
            null;
          upsert(size, vid);
        });
      });

      // deep fallback scan under color node
      try {
        const stack = [colorNode];
        while (stack.length) {
          const cur = stack.pop();
          if (!cur || typeof cur !== "object") continue;
          const keys = Object.keys(cur).map((k) => k.toLowerCase());
          const hasSizeKey = keys.some((k) => k.includes("size"));
          const variantKey = keys.find(
            (k) => (k.includes("variant") && k.includes("id")) || k === "variantid"
          );
          if (hasSizeKey && variantKey) {
            const sizeVal =
              cur.size || cur.Size || cur.label || cur.name || cur.s || "";
            const vid = cur[Object.keys(cur).find(
              (kk) => {
                const kkl = kk.toLowerCase();
                return (
                  (kkl.includes("variant") && kkl.includes("id")) ||
                  kkl === "variantid" ||
                  kkl === "printrove_variant_id"
                );
              }
            )];
            upsert(sizeVal, vid);
          }
          for (const v of Object.values(cur)) {
            if (v && typeof v === "object") stack.push(v);
          }
        }
      } catch {}
    }

    // 4) deep fallback scan over entire product
    try {
      const stack = [details];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== "object") continue;
        const keys = Object.keys(cur).map((k) => k.toLowerCase());
        const hasSizeKey = keys.some((k) => k.includes("size"));
        const variantKey = keys.find(
          (k) => (k.includes("variant") && k.includes("id")) || k === "variantid"
        );
        if (hasSizeKey && variantKey) {
          const sizeVal =
            cur.size || cur.Size || cur.label || cur.name || cur.s || "";
          const vid = cur[Object.keys(cur).find(
            (kk) => {
              const kkl = kk.toLowerCase();
              return (
                (kkl.includes("variant") && kkl.includes("id")) ||
                kkl === "variantid" ||
                kkl === "printrove_variant_id"
              );
            }
          )];
          upsert(sizeVal, vid);
        }
        for (const v of Object.values(cur)) {
          if (v && typeof v === "object") stack.push(v);
        }
      }
    } catch {}

    return map;
  };

  // ======================== SAVE LOGIC ========================
  const saveSelectedViews = async () => {
    try {
      setIsSaving(true);
      const images = {};

      for (let view of views) {
        const node = designRefs[view]?.current;
        if (!node) continue;

        await waitForImages(node);

        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#fff",
          skipFonts: true, // avoid Google Fonts cssRules CORS noise
        });

        images[view] = dataUrl;
      }

      // Identify user
      const userData = JSON.parse(localStorage.getItem("user")) || {};
      const userId =
        userData?._id || userData?.id || "66bff9df5e3a9d0d8d70b5f2"; // fallback test id

      // Assemble design doc
      const designPayload = {
        user: userId,
        products: productDetails?._id || proid,
        cutomerprodcuts: productDetails?.products_name || "Custom Product",
        design: [
          {
            front: allDesigns.front,
            back: allDesigns.back,
            left: allDesigns.left,
            right: allDesigns.right,
            previewImages: images,
            color: colorWithHash,
            additionalFilesMeta: additionalFiles.map((f) => ({
              name: f.name,
              size: f.file?.size,
              type: f.file?.type,
            })),
          },
        ],
      };

      console.log("🎨 Sending Design Payload:", designPayload);
      await createDesign(designPayload);

      // Quantities cleanup + canonicalization
      const cleanedQuantities = Object.fromEntries(
        Object.entries(passedQuantity || {}).map(([k, v]) => [
          canonSize(k),
          Number(v) || 0,
        ])
      );
      const finalQuantities = Object.fromEntries(
        Object.entries(cleanedQuantities).filter(([_, v]) => v > 0)
      );

      // Extract mappings
      const printroveProductId = extractPrintroveProductId(productDetails);
      
      // Enhanced logging for debugging
      console.log("🔍 Product Details for Variant Mapping:", {
        productId: productDetails?._id,
        printroveProductId,
        color: colorWithHash,
        availableVariantSources: {
          hasVariantMapping: !!productDetails?.variant_mapping,
          hasPricing: !!productDetails?.pricing,
          hasColorVariants: !!productDetails?.image_url?.find(e => e.colorcode === colorWithHash)?.variant_mapping,
        },
        rawProductData: productDetails
      });
      
      // ✅ Try to get Printrove mappings from API first
      let variantMap = {};
      try {
        const response = await axios.get(`http://localhost:3000/api/printrove/mappings/${productDetails._id}`);
        if (response.data.success && response.data.mapping) {
          const mapping = response.data.mapping;
          console.log("🎯 Found Printrove mapping:", mapping);
          
          // Use the mapping variants
          mapping.variants?.forEach(variant => {
            if (variant.isAvailable && variant.ducoSize && variant.printroveVariantId) {
              const canonicalSize = canonSize(variant.ducoSize);
              variantMap[canonicalSize] = variant.printroveVariantId;
            }
          });
          
          if (Object.keys(variantMap).length > 0) {
            console.log("✅ Using Printrove API mappings:", variantMap);
          }
        }
      } catch (error) {
        console.warn("⚠️ Could not fetch Printrove mappings from API:", error.message);
      }

      // Fallback to existing buildVariantMap if no API mappings found
      if (Object.keys(variantMap).length === 0) {
        variantMap = buildVariantMap(productDetails);
        console.log("🔄 Using fallback variant mapping:", variantMap);
      }
      
      console.log("🧭 Final Variant Map:", variantMap);
      console.log("📦 Selected Quantities:", finalQuantities);

      // Build line items only for mapped sizes
      // ✅ All line items processing moved to finalPrintroveLineItems below

      // ✅ Create line items for all sizes (with or without variant IDs)
      const finalPrintroveLineItems = Object.entries(finalQuantities).map(
        ([size, qty]) => {
          const canonicalSize = canonSize(size);
          const variantId = variantMap[canonicalSize];
          
          console.log(`🔍 Size mapping: ${size} -> ${canonicalSize} -> variant ${variantId || 'MISSING'}`);
          
          return {
            size,
            qty,
            printroveVariantId: variantId || null,
          };
        }
      );

      // Log mapping results
      const mappedSizes = finalPrintroveLineItems.filter(item => item.printroveVariantId);
      const unmappedSizes = finalPrintroveLineItems.filter(item => !item.printroveVariantId);
      
      console.log("📊 Variant Mapping Results:", {
        totalSizes: finalPrintroveLineItems.length,
        mappedSizes: mappedSizes.length,
        unmappedSizes: unmappedSizes.length,
        variantMap,
        finalLineItems: finalPrintroveLineItems
      });

      // ✅ Show informative messages but don't block the process
      if (!printroveProductId) {
        console.warn("⚠️ Missing Printrove Product ID - backend will handle fallback");
      }

      if (unmappedSizes.length > 0) {
        console.warn("⚠️ Some sizes missing variant IDs - backend will handle fallback:", 
          unmappedSizes.map(item => item.size));
      }

      // Fallback single variant id from the first mapped line item (legacy field)
      const fallbackVariantId = finalPrintroveLineItems.find(item => item.printroveVariantId)?.printroveVariantId || null;
      const needsProductId = !printroveProductId;

      // Build cart product
      const customProduct = {
        id: `custom-tshirt-${Date.now()}`,
        productId: productDetails?._id || proid,
        products_name: productDetails?.products_name || "Custom T-Shirt",
        name: productDetails?.products_name || "Custom T-Shirt",
        timestamp: new Date().toISOString(), // ✅ Add timestamp for debugging
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ✅ Unique session ID
        printroveProductId: printroveProductId || null,
        printroveVariantId: fallbackVariantId, // legacy single
        printroveVariantsBySize: Object.fromEntries(
          finalPrintroveLineItems
            .filter(item => item.printroveVariantId)
            .map(item => [item.size, item.printroveVariantId])
        ),
        printroveLineItems: finalPrintroveLineItems, // All line items with or without variant IDs
        printroveNeedsMapping: {
          missingProductId: needsProductId,
          unmappedSizes: finalPrintroveLineItems.filter(item => !item.printroveVariantId).map(item => item.size),
        },
        design: {
          ...allDesigns,
          frontImage: images.front,
          backImage: images.back,
        },
        previewImages: images,
        color: colorWithHash,
        colortext: productDetails?.colortext || "Custom",
        gender: productDetails?.gender || "Unisex",
        price: applyLocationPricing(
          productDetails?.pricing?.[0]?.price_per || 499,
          priceIncrease,
          conversionRate
        ),
        quantity: finalQuantities,
        additionalFilesMeta: additionalFiles.map((f) => ({ name: f.name })),
      };

      // ✅ Log pricing calculation details
      const basePrice = productDetails?.pricing?.[0]?.price_per || 499;
      const finalPrice = customProduct.price;
      
      console.log("💰 PRICING CALCULATION:", {
        basePrice,
        priceIncrease,
        conversionRate,
        currency,
        resolvedLocation,
        finalPrice,
        calculation: `${basePrice} + ${priceIncrease}% + conversion(${conversionRate}) = ${finalPrice}`
      });

      console.log("🧾 FINAL PRODUCT BEFORE ADDING TO CART:", {
        id: productDetails?._id || proid,
        _id: productDetails?._id || proid,
        printroveProductId: printroveProductId || null,
        printroveVariantId: fallbackVariantId || null, // legacy single
        legacyVariant: fallbackVariantId,
        printroveVariantsBySize: customProduct.printroveVariantsBySize,
        lineItems: finalPrintroveLineItems,
        needsMapping: customProduct.printroveNeedsMapping,
        quantities: finalQuantities,
        variantMap: variantMap,
        hasVariantMappings: Object.keys(variantMap).length > 0,
        mappedSizesCount: finalPrintroveLineItems.filter(item => item.printroveVariantId).length,
        totalSizesCount: finalPrintroveLineItems.length,
        locationPricing: {
          basePrice,
          finalPrice,
          location: resolvedLocation,
          currency
        }
      });

      // Final validation log
      const mappedItems = finalPrintroveLineItems.filter(item => item.printroveVariantId);
      if (mappedItems.length > 0) {
        console.log("✅ Product has valid Printrove mappings:", {
          productId: printroveProductId,
          mappedSizes: mappedItems.map(li => `${li.size}: ${li.printroveVariantId}`)
        });
      } else {
        console.warn("⚠️ Product added to cart WITHOUT Printrove mappings - backend will handle fallback");
      }

      // ✅ Clear existing cart items before adding new design
      console.log("🧹 Clearing cart before adding new design...");
      clearCart();
      
      addToCart(customProduct);
      
      // ✅ Show success message with variant mapping info
      const mappedCount = finalPrintroveLineItems.filter(item => item.printroveVariantId).length;
      const totalCount = finalPrintroveLineItems.length;

      if (mappedCount === totalCount) {
        showCuteMessage("Yay! Your awesome design is ready to rock! 🎨✨", "🛒");
      } else if (mappedCount > 0) {
        showCuteMessage("Sweet! Your design is in the cart and looking fabulous! 💫", "🎯");
      } else {
        showCuteMessage("Perfect! Your creative masterpiece is all set! 🌟", "🎨");
      }

      navigate("/cart");
    } catch (error) {
      console.error("Error saving design:", error);
      showCuteMessage("Oops! Something went wrong. Let's try that again! 🔄", "😅");
    } finally {
      setIsSaving(false);
    }
  };

  // ======================== CONTROLS ========================
  const renderControls = () => (
    <div className="space-y-6">
      {/* Upload Logo */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Upload Logo
        </h3>
        <label className="flex flex-col items-center px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
          <span className="text-xs text-gray-600">Click to upload</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Additional Files */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Upload Additional CDR Files
        </h3>
        <label className="flex flex-col items-center px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
          <span className="text-xs text-gray-600">
            Click to select CDR files
          </span>
          <input
            type="file"
            multiple
            onChange={handleAdditionalFilesUpload}
            className="hidden"
          />
        </label>
        <ul className="mt-2 max-h-24 overflow-auto text-xs text-gray-600">
          {additionalFiles.map((fileObj, i) => (
            <li key={i} className="truncate" title={fileObj.name}>
              {fileObj.name}
            </li>
          ))}
        </ul>
      </div>

      {allDesigns[side].uploadedImage && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Logo Size
          </h3>
          <input
            type="range"
            min="50"
            max="300"
            value={allDesigns[side].imageSize}
            onChange={(e) =>
              updateCurrentDesign("imageSize", Number(e.target.value))
            }
            className="w-full"
          />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Custom Text
        </h3>
        <input
          type="text"
          value={allDesigns[side].customText}
          onChange={(e) => updateCurrentDesign("customText", e.target.value)}
          placeholder="Your slogan here"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Text Size
          </h3>
          <input
            type="number"
            value={allDesigns[side].textSize}
            onChange={(e) =>
              updateCurrentDesign("textSize", Number(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm"
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Text Color
          </h3>
          <input
            type="color"
            value={allDesigns[side].textColor}
            onChange={(e) => updateCurrentDesign("textColor", e.target.value)}
            className="w-10 h-10 rounded-full cursor-pointer"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Font Style</h3>
        <select
          onChange={(e) => updateCurrentDesign("font", e.target.value)}
          value={allDesigns[side].font}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm"
        >
          <option value="font-sans">Sans - Modern</option>
          <option value="font-serif">Serif - Classic</option>
          <option value="font-mono">Mono - Minimal</option>
        </select>
      </div>
    </div>
  );

  // ======================== HELPER FUNCTIONS ========================
  const getCenterPosition = () => ({ x: 45, y: 55 }); // Moved down to chest area
  
  const getElementPosition = useCallback((view, elementId) => {
    const position = allDesigns[view]?.positions?.[elementId] || getCenterPosition();
    return position;
  }, [allDesigns]);

  // ======================== RENDER DESIGN AREA ========================
  const renderDesignArea = (view) => {
    const design = allDesigns[view];
    const isActive = view === side;
    
    // View rendering logic
    
    return (
      <div
        ref={designRefs[view]}
        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-300 design-area-container ${
          isActive
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ 
          minHeight: '400px',
          position: 'absolute', // Force absolute positioning
          zIndex: isActive ? 10 : 1, // Ensure active view is on top
        }}
      >
        <img
          src={sideimage[getViewIndex(view)] || menstshirt}
          alt={`${view} T-shirt`}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-0 ${
            view === 'back' ? 'scale-x-[-1]' : // Flip horizontally for back view
            view === 'left' ? 'rotate-[-10deg]' : // Slight rotation for left view
            view === 'right' ? 'rotate-[10deg]' : // Slight rotation for right view
            '' // No transform for front view
          }`}
          crossOrigin="anonymous"
          onError={(e) => {
            console.error(`Failed to load T-shirt image for ${view}:`, e.target.src);
            console.log("🔄 Falling back to default T-shirt image");
            e.target.src = menstshirt; // Fallback to default image
          }}
          onLoad={(e) => {
            console.log(`✅ T-shirt image loaded for ${view}:`, e.target.src);
          }}
        />
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            zIndex: 20,
            pointerEvents: 'auto', // Allow draggable interactions
          }}
        >
          {/* View Label */}
          {isActive && (
            <div className="absolute top-4 left-4 z-30 pointer-events-none">
              <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {view.charAt(0).toUpperCase() + view.slice(1)} View
              </div>
            </div>
          )}

          {/* Center Guide */}
          {showCenterGuide && isActive && (
            <div 
              className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-pulse z-30 pointer-events-none"
              style={{ 
                left: '50%', 
                top: '45%', 
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 15px rgba(255, 193, 7, 0.8)'
              }}
            />
          )}
          
          {design.uploadedImage && (
            <CustomDraggableItem
              id={`uploaded-image-${view}`}
              position={getElementPosition(view, `uploaded-image-${view}`)}
              onPositionChange={handlePositionChange}
            >
              <img
                src={design.uploadedImage}
                alt="Uploaded"
                style={{
                  width: `${
                    isMobile ? design.imageSize * 0.7 : design.imageSize
                  }px`,
                  height: `${
                    isMobile ? design.imageSize * 0.7 : design.imageSize
                  }px`,
                  padding: "4px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  border: "2px solid rgba(0, 0, 0, 0.2)",
                  pointerEvents: "none", // Let parent handle events
                }}
                className="object-contain hover:shadow-lg transition-shadow duration-200"
                draggable={false}
              />
            </CustomDraggableItem>
          )}
          {design.customText && (
            <CustomDraggableItem
              id={`custom-text-${view}`}
              position={getElementPosition(view, `custom-text-${view}`)}
              onPositionChange={handlePositionChange}
            >
              <p
                className={`select-none ${design.font} font-semibold hover:shadow-lg transition-shadow duration-200`}
                style={{
                  fontSize: `${
                    isMobile ? design.textSize * 0.8 : design.textSize
                  }px`,
                  color: design.textColor,
                  whiteSpace: "nowrap",
                  padding: "2px 4px",
                  borderRadius: "0px",
                  backgroundColor: "transparent", // No background
                  border: "none", // No border
                  textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)", // Subtle shadow for readability
                  minWidth: "20px",
                  minHeight: "20px",
                  display: "inline-block",
                  pointerEvents: "none", // Let parent handle events
                }}
              >
                {design.customText}
              </p>
            </CustomDraggableItem>
          )}
        </div>
      </div>
    );
  };

  // ======================== JSX ========================
  return (
    <>
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-lg font-semibold bg-gray-800 px-6 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Creating your masterpiece... ✨</span>
            </div>
          </div>
        </div>
      )}

      {/* Cute Message Toast */}
      {cuteMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cuteMessage.emoji}</span>
              <div>
                <p className="font-semibold text-sm">{cuteMessage.text}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row p-0 lg:p-4 relative">
        {/* Sidebar (desktop only) */}
        <aside className="hidden lg:block w-80 bg-white rounded-2xl shadow-xl p-6 border border-gray-300">
          {renderControls()}
          
          {/* ✅ Price Display with Location Pricing */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Price</p>
              <p className="text-2xl font-bold text-green-600">
                {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'}
                {applyLocationPricing(
                  productDetails?.pricing?.[0]?.price_per || 499,
                  priceIncrease,
                  conversionRate
                )}
              </p>
              {resolvedLocation && resolvedLocation !== 'Asia' && (
                <p className="text-xs text-gray-500 mt-1">
                  📍 {resolvedLocation} pricing (+{priceIncrease || 0}%)
                </p>
              )}
            </div>
          </div>

          <button
            onClick={saveSelectedViews}
            className="mt-6 py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg w-full hidden lg:block"
          >
            Submit <MdNavigateNext size={20} className="ml-2 inline" />
          </button>
        </aside>

        <main className="flex-1 flex items-center justify-center mt-4 lg:mt-0 relative p-4">
          <div className="relative w-full max-w-2xl h-96 sm:h-[30rem] md:h-[38rem] rounded-3xl mx-auto pt-20">
            {/* View Switcher */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {views.map((view) => (
                <button
                  key={view}
                  onClick={() => setSide(view)}
                  className={`px-3 py-1 text-sm sm:px-4 sm:py-2 sm:text-base font-medium transition-all ${
                    side === view
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-800 text-white"
                  } rounded-md`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            {/* Loading State */}
            {isLoadingProduct ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-3xl">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading T-shirt...</p>
                </div>
              </div>
            ) : (
              views.map((view) => (
                <div key={view}>{renderDesignArea(view)}</div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Bottom Panel (mobile only) */}
      {isMobile && (
        <>
          {/* Active Panel */}
          {activeTab !== "none" && (
            <div className="fixed bottom-30 left-0 w-full bg-white border-t border-gray-300 shadow-lg z-40">
              <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
                {activeTab === "upload" && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Upload Logo
                    </h3>
                    <label className="flex flex-col items-center px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
                      <span className="text-xs text-gray-600">
                        Click to upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {allDesigns[side].uploadedImage && (
                      <>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                          Logo Size
                        </h3>
                        <input
                          type="range"
                          min="50"
                          max="300"
                          value={allDesigns[side].imageSize}
                          onChange={(e) =>
                            updateCurrentDesign(
                              "imageSize",
                              Number(e.target.value)
                            )
                          }
                          className="w-full"
                        />
                      </>
                    )}
                  </>
                )}

                {activeTab === "additional" && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Upload Additional Files
                    </h3>
                    <label className="flex flex-col items-center px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
                      <span className="text-xs text-gray-600">
                        Click to select files
                      </span>
                      <input
                        type="file"
                        multiple
                        onChange={handleAdditionalFilesUpload}
                        className="hidden"
                      />
                    </label>
                    <ul className="mt-2 max-h-24 overflow-auto text-xs text-gray-600">
                      {additionalFiles.map((fileObj, i) => (
                        <li key={i} className="truncate" title={fileObj.name}>
                          {fileObj.name}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === "text" && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Custom Text
                    </h3>
                    <input
                      type="text"
                      value={allDesigns[side].customText}
                      onChange={(e) =>
                        updateCurrentDesign("customText", e.target.value)
                      }
                      placeholder="Your slogan here"
                      className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                    />

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                          Text Size
                        </h3>
                        <input
                          type="number"
                          value={allDesigns[side].textSize}
                          onChange={(e) =>
                            updateCurrentDesign(
                              "textSize",
                              Number(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                          Text Color
                        </h3>
                        <input
                          type="color"
                          value={allDesigns[side].textColor}
                          onChange={(e) =>
                            updateCurrentDesign("textColor", e.target.value)
                          }
                          className="w-10 h-10 rounded-full cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "font" && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Font Style
                    </h3>
                    <select
                      onChange={(e) =>
                        updateCurrentDesign("font", e.target.value)
                      }
                      value={allDesigns[side].font}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm"
                    >
                      <option value="font-sans">Sans - Modern</option>
                      <option value="font-serif">Serif - Classic</option>
                      <option value="font-mono">Mono - Minimal</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ✅ Mobile Price Display */}
          <div className="fixed bottom-16 left-0 w-full bg-white border-t border-gray-200 py-2 z-40 lg:hidden">
            <div className="text-center">
              <span className="text-lg font-bold text-green-600">
                {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'}
                {applyLocationPricing(
                  productDetails?.pricing?.[0]?.price_per || 499,
                  priceIncrease,
                  conversionRate
                )}
              </span>
              {resolvedLocation && resolvedLocation !== 'Asia' && (
                <span className="text-xs text-gray-500 ml-2">
                  📍 {resolvedLocation} (+{priceIncrease || 0}%)
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={saveSelectedViews}
            className="fixed bottom-0 left-0 w-full py-4 bg-green-600 text-white text-lg font-semibold rounded-none hover:bg-green-700 shadow-lg z-50 lg:static lg:w-auto lg:rounded-lg lg:mt-6 lg:px-6 lg:py-3"
          >
            Submit <MdNavigateNext size={22} className="ml-2 inline" />
          </button>

          {/* Tab Bar */}
          <div className="fixed bottom-20 left-0 w-full bg-gray-800 text-white flex justify-around py-2 z-50">
            <button
              onClick={() => setActiveTab("upload")}
              className="flex flex-col items-center"
            >
              <FaUpload size={20} />
              <span className="text-[10px]">Upload</span>
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className="flex flex-col items-center"
            >
              <FaRegKeyboard size={20} />
              <span className="text-[10px]">Text</span>
            </button>
            <button
              onClick={() => setActiveTab("font")}
              className="flex flex-col items-center"
            >
              <FaFont size={20} />
              <span className="text-[10px]">Font</span>
            </button>
            <button
              onClick={() => setActiveTab("none")}
              className="flex flex-col items-center"
            >
              <FaTimes size={20} />
              <span className="text-[10px]">Close</span>
            </button>
            <button
              onClick={() => setActiveTab("additional")}
              className="flex flex-col items-center"
            >
              <FaUpload size={20} />
              <span className="text-[10px]">Files</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default TshirtDesigner;
