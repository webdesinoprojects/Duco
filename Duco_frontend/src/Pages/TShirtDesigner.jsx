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
import { toast } from "react-toastify";

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

  // ✅ Helper to get coordinates from mouse or touch event
  const getCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX || 0, y: e.clientY || 0 };
  };

  const handleStart = useCallback((e) => {
    console.log(`🎯 Drag start: ${id}`);
    setIsDragging(true);
    const coords = getCoordinates(e);
    setStartPos(coords);
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
  }, [id]);

  const handleMove = useCallback((e) => {
    if (!isDragging) return;

    // Get the T-shirt container (the main design area)
    const container = elementRef.current?.closest('.design-area-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const coords = getCoordinates(e);
    
    if (coords.x === 0 && coords.y === 0) return; // Invalid coordinates
    
    const deltaX = coords.x - startPos.x;
    const deltaY = coords.y - startPos.y;

    // Convert pixel movement to percentage
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    // Calculate new position with constraints
    const newPos = {
      x: Math.max(10, Math.min(90, position.x + deltaXPercent)),
      y: Math.max(10, Math.min(90, position.y + deltaYPercent)),
    };

    setCurrentPos(newPos);
    
    // Prevent default scrolling on iOS
    if (e.preventDefault) {
      e.preventDefault();
    }
  }, [isDragging, startPos, position]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    console.log(`🎯 Drag end: ${id} -> x:${currentPos.x.toFixed(1)}, y:${currentPos.y.toFixed(1)}`);

    // Update the actual position in parent state
    onPositionChange(id, currentPos);
    setIsDragging(false);
  }, [isDragging, id, currentPos, onPositionChange]);

  // ✅ Global mouse and touch events with iOS compatibility
  useEffect(() => {
    if (isDragging) {
      const moveHandler = (e) => handleMove(e);
      const endHandler = (e) => handleEnd(e);
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', endHandler);
      document.addEventListener('touchmove', moveHandler, { passive: false });
      document.addEventListener('touchend', endHandler, { passive: false });
      document.addEventListener('touchcancel', endHandler, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);
        document.removeEventListener('touchcancel', endHandler);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  const style = {
    position: "absolute",
    left: `${currentPos.x}%`,
    top: `${currentPos.y}%`,
    transform: "translate(-50%, -50%)",
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 100 : 50,
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    WebkitUserDrag: "none",
    WebkitTapHighlightColor: "transparent",
    pointerEvents: "auto",
    // iOS specific fixes
    WebkitTransform: `translate(-50%, -50%)`,
    WebkitBackfaceVisibility: "hidden",
    WebkitPerspective: 1000,
  };

  return (
    <div
      ref={elementRef}
      style={style}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
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
    // ✅ CRITICAL FIX: Multiply by conversion rate, NOT divide
    // Conversion rate represents: 1 INR = X target_currency
    // Example: 1 INR = 0.011 EUR, so 500 INR = 500 * 0.011 = 5.5 EUR ✅
    // NOT: 500 / 0.011 = 45,454 EUR ❌ WRONG
    if (conversionRate && conversionRate !== 1) {
      price = price * conversionRate;
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

  // Debug URL parameters
  console.log("🔍 URL Parameters Debug:", {
    productId: proid,
    colorParam: color,
    colorWithHash: colorWithHash
  });

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

  // ✅ Load design from location.state if editing an existing design
  useEffect(() => {
    if (location.state?.design) {
      console.log("📝 Loading existing design for editing:", location.state.design);
      setAllDesigns(prev => ({
        ...prev,
        front: location.state.design.front || prev.front,
        back: location.state.design.back || prev.back,
        left: location.state.design.left || prev.left,
        right: location.state.design.right || prev.right,
      }));
    }
  }, [location.state?.design]);

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
        console.log("🔍 DETAILED PRODUCT ANALYSIS:", {
          productId: data?._id,
          hasImageUrl: !!data?.image_url,
          imageUrlLength: data?.image_url?.length,
          imageUrlStructure: data?.image_url?.map((img, index) => ({
            index,
            color: img.color,
            colorcode: img.colorcode,
            hasDesigntshirt: !!img.designtshirt,
            designtshirtLength: img.designtshirt?.length,
            designtshirtData: img.designtshirt
          }))
        });
        setProductDetails(data);

        // Try multiple color matching strategies
        let match = data?.image_url?.find(
          (e) => e.colorcode === colorWithHash
        );

        // Fallback 1: Try without hash
        if (!match && colorWithHash.startsWith('#')) {
          match = data?.image_url?.find(
            (e) => e.colorcode === colorWithHash.substring(1)
          );
          console.log("🔄 Trying color match without hash:", colorWithHash.substring(1));
        }

        // Fallback 2: Try with hash if original didn't have it
        if (!match && !colorWithHash.startsWith('#')) {
          match = data?.image_url?.find(
            (e) => e.colorcode === `#${colorWithHash}`
          );
          console.log("🔄 Trying color match with hash:", `#${colorWithHash}`);
        }

        // Fallback 3: Case insensitive match
        if (!match) {
          match = data?.image_url?.find(
            (e) => e.colorcode?.toLowerCase() === colorWithHash.toLowerCase()
          );
          console.log("🔄 Trying case insensitive match");
        }

        // Fallback 4: Use first color if no match found
        if (!match && data?.image_url?.length > 0) {
          match = data.image_url[0];
          console.log("🔄 Using first available color as fallback:", match.colorcode);
        }

        console.log("🎨 Color matching debug:", {
          colorWithHash,
          availableColors: data?.image_url?.map(img => img.colorcode),
          availableColorsDetailed: data?.image_url?.map(img => ({
            color: img.color,
            colorcode: img.colorcode,
            hasDesigntshirt: !!img.designtshirt,
            designtshirtArray: img.designtshirt
          })),
          match: match,
          designtshirt: match?.designtshirt,
          fullImageUrlData: data?.image_url,
          matchedColorData: match
        });

        const designImages = match?.designtshirt || [];

        // Create array with proper fallbacks for each view
        const processedImages = [
          designImages[0] || menstshirt, // front
          designImages[1] || menstshirt, // back  
          designImages[2] || menstshirt, // left
          designImages[3] || menstshirt, // right
        ];

        setSideimage(processedImages);

        console.log('🖼️ T-shirt images loaded:', {
          front: !!designImages[0],
          back: !!designImages[1],
          left: !!designImages[2],
          right: !!designImages[3],
          fallbackUsed: designImages.length === 0,
          processedImages: processedImages,
          rawDesignImages: designImages,
          designImagesLength: designImages.length
        });

        // Additional debugging for image URLs
        if (designImages.length > 0) {
          console.log('🔍 Design image URLs:', designImages);
          designImages.forEach((img, index) => {
            const viewName = ['Front', 'Back', 'Left', 'Right'][index];
            console.log(`${viewName} view image:`, img || 'MISSING');
          });
        } else {
          console.log('⚠️ No design images found - using fallback white T-shirt');
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
      console.log(`📸 Image upload started for ${side} side`);
      console.log(`📸 Current allDesigns before image upload:`, allDesigns);
      
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

        console.log(`✅ Image uploaded for ${side} side`);
        console.log(`📋 All designs after image upload:`, {
          front: { hasUploadedImage: !!result.front?.uploadedImage, hasCustomText: !!result.front?.customText },
          back: { hasUploadedImage: !!result.back?.uploadedImage, hasCustomText: !!result.back?.customText },
          left: { hasUploadedImage: !!result.left?.uploadedImage, hasCustomText: !!result.left?.customText },
          right: { hasUploadedImage: !!result.right?.uploadedImage, hasCustomText: !!result.right?.customText },
        });

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
    
    // ✅ Validate files before uploading
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
    const MAX_FILES = 5;
    const ALLOWED_TYPES = ['application/pdf', 'application/x-cdr', 'image/x-cdr'];
    
    // Check file count
    if (additionalFiles.length + files.length > MAX_FILES) {
      toast.error(`❌ Maximum ${MAX_FILES} files allowed. You have ${additionalFiles.length} files already.`);
      return;
    }
    
    // Validate each file
    for (const file of files) {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.cdr') && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error(`❌ Invalid file type: ${file.name}. Only CDR and PDF files are allowed.`);
        return;
      }
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`❌ File too large: ${file.name}. Maximum size is 50MB.`);
        return;
      }
    }
    
    // ✅ Read files as data URLs so they can be stored and displayed
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAdditionalFiles((prevFiles) => [
          ...prevFiles,
          {
            name: file.name,
            file,
            dataUrl: reader.result, // ✅ Store the file as data URL
            type: file.type,
            size: file.size,
          },
        ]);
        toast.success(`✅ File uploaded: ${file.name}`);
      };
      reader.onerror = () => {
        toast.error(`❌ Failed to read file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  };

  // ✅ Remove a file from the list
  const removeAdditionalFile = (index) => {
    setAdditionalFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    toast.info(`📎 File removed`);
  };

  // ✅ Clear all files
  const clearAllFiles = () => {
    setAdditionalFiles([]);
    toast.info(`📎 All files cleared`);
  };

  const updateCurrentDesign = (property, value) => {
    console.log(`📝 updateCurrentDesign called: side=${side}, property=${property}, value=`, value);
    console.log(`📝 Current allDesigns state before update:`, allDesigns);
    
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

      // ✅ Ensure all sides are preserved when updating current side
      const updatedDesign = {
        ...prev,
        [side]: {
          ...prev[side],
          [property]: value,
          positions: newPositions,
        },
      };

      console.log(`✅ Updated ${side} design - property: ${property}, value:`, value);
      console.log(`📋 All designs after update:`, {
        front: { hasUploadedImage: !!updatedDesign.front?.uploadedImage, hasCustomText: !!updatedDesign.front?.customText },
        back: { hasUploadedImage: !!updatedDesign.back?.uploadedImage, hasCustomText: !!updatedDesign.back?.customText },
        left: { hasUploadedImage: !!updatedDesign.left?.uploadedImage, hasCustomText: !!updatedDesign.left?.customText },
        right: { hasUploadedImage: !!updatedDesign.right?.uploadedImage, hasCustomText: !!updatedDesign.right?.customText },
      });

      return updatedDesign;
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
    console.log(`⏳ Waiting for ${images.length} images in ${container.className}...`);
    
    if (images.length === 0) {
      console.log("✅ No images to wait for");
      return Promise.resolve();
    }
    
    return Promise.all(
      Array.from(images).map(
        (img, index) =>
          new Promise((resolve) => {
            console.log(`⏳ Image ${index + 1}/${images.length}:`, {
              src: img.src.substring(0, 100),
              complete: img.complete,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            });
            
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              console.log(`✅ Image ${index + 1} already loaded (${img.naturalWidth}x${img.naturalHeight})`);
              resolve();
            } else {
              let resolved = false;
              
              img.onload = () => {
                if (!resolved) {
                  resolved = true;
                  console.log(`✅ Image ${index + 1} loaded (${img.naturalWidth}x${img.naturalHeight})`);
                  resolve();
                }
              };
              
              img.onerror = () => {
                if (!resolved) {
                  resolved = true;
                  console.warn(`⚠️ Image ${index + 1} failed to load: ${img.src}`);
                  resolve();
                }
              };
              
              // Timeout after 8 seconds (increased from 5)
              const timeoutId = setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  console.warn(`⏱️ Image ${index + 1} timeout after 8s, continuing anyway`);
                  resolve();
                }
              }, 8000);
              
              // Clear timeout if image loads before timeout
              img.onload = (() => {
                const originalOnload = img.onload;
                return () => {
                  clearTimeout(timeoutId);
                  if (!resolved) {
                    resolved = true;
                    console.log(`✅ Image ${index + 1} loaded (${img.naturalWidth}x${img.naturalHeight})`);
                    resolve();
                  }
                };
              })();
            }
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
    } catch { }
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
      } catch { }
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
    } catch { }

    return map;
  };

  // ======================== SAVE LOGIC ========================
  const saveSelectedViews = async () => {
    try {
      setIsSaving(true);
      const images = {};

      // ✅ Temporarily show all views for capturing
      const designAreaContainers = document.querySelectorAll('.design-area-container');
      const originalStyles = [];
      
      designAreaContainers.forEach((container) => {
        originalStyles.push({
          element: container,
          opacity: container.style.opacity,
          pointerEvents: container.style.pointerEvents,
          display: container.style.display,
          visibility: container.style.visibility,
          className: container.className,
          styleAttribute: container.getAttribute('style'), // Store original style attribute
        });
        // Make all views visible for capturing - use setAttribute to bypass Tailwind
        container.setAttribute('style', `
          opacity: 1 !important;
          pointer-events: auto !important;
          display: block !important;
          visibility: visible !important;
        `);
        // Remove opacity-0 and pointer-events-none classes
        container.classList.remove('opacity-0', 'pointer-events-none');
        container.classList.add('opacity-100', 'pointer-events-auto');
      });

      // ✅ Force reflow and wait for DOM to fully update after visibility changes
      designAreaContainers.forEach((container) => {
        // Force reflow by accessing offsetHeight
        const _ = container.offsetHeight;
      });
      
      // Wait longer to ensure all CSS is applied and rendered
      await new Promise(resolve => setTimeout(resolve, 300));

      for (let view of views) {
        const node = designRefs[view]?.current;
        if (!node) {
          console.warn(`⚠️ No design ref found for ${view}`);
          continue;
        }

        await waitForImages(node);

        try {
          // ✅ Add extra wait time for DOM to fully render after images load
          await new Promise(resolve => setTimeout(resolve, 800));

          // ✅ Log the node being captured
          const computedStyle = window.getComputedStyle(node);
          console.log(`📸 Capturing ${view} view:`, {
            nodeVisible: node.offsetHeight > 0 && node.offsetWidth > 0,
            nodeHeight: node.offsetHeight,
            nodeWidth: node.offsetWidth,
            nodeOpacity: computedStyle.opacity,
            nodeDisplay: computedStyle.display,
            nodeClasses: node.className,
            hasChildren: node.children.length,
            designData: {
              hasUploadedImage: !!allDesigns[view]?.uploadedImage,
              hasCustomText: !!allDesigns[view]?.customText,
            },
            childrenInfo: Array.from(node.children).map(child => ({
              tag: child.tagName,
              classes: child.className,
              visible: child.offsetHeight > 0 && child.offsetWidth > 0,
              src: child.src ? child.src.substring(0, 50) : 'N/A',
            }))
          });

          const dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#fff",
            skipFonts: true, // avoid Google Fonts cssRules CORS noise
          });

          // ✅ Validate captured image is not blank
          if (dataUrl.length < 5000) {
            console.warn(`⚠️ CAPTURED IMAGE IS BLANK for ${view}: only ${dataUrl.length} bytes (expected > 5000)`);
            console.warn(`⚠️ This might indicate the design elements weren't rendered properly`);
            // Still save it, but log the warning
          }

          images[view] = dataUrl;
          console.log(`✅ Captured preview image for ${view}:`, {
            dataUrlLength: dataUrl.length,
            isBlank: dataUrl.length < 5000,
            preview: dataUrl.substring(0, 100) + '...'
          });
        } catch (error) {
          console.error(`❌ Failed to capture ${view} preview:`, error);
          // Set a blank image if capture fails
          images[view] = null;
        }
      }

      // ✅ Restore original styles
      originalStyles.forEach(({ element, opacity, pointerEvents, display, visibility, className, styleAttribute }) => {
        // Restore original style attribute
        if (styleAttribute) {
          element.setAttribute('style', styleAttribute);
        } else {
          element.removeAttribute('style');
        }
        // Restore original classes
        element.className = className;
      });

      // ✅ Preview images stored in memory - no Cloudinary upload needed
      console.log('🖼️ Preview images ready for cart storage:', {
        usingCloudinary: false,
        images: Object.keys(images).reduce((acc, key) => {
          acc[key] = images[key] ? `${images[key].substring(0, 50)}...` : 'MISSING';
          return acc;
        }, {})
      });

      // Identify user
      const userData = JSON.parse(localStorage.getItem("user")) || {};
      const userId =
        userData?._id || userData?.id || "66bff9df5e3a9d0d8d70b5f2"; // fallback test id

      // ✅ Log all designs before capturing to verify they're all present
      console.log("🔍 ALL DESIGNS STATE BEFORE CAPTURE:", {
        front: {
          hasUploadedImage: !!allDesigns.front?.uploadedImage,
          hasCustomText: !!allDesigns.front?.customText,
          customText: allDesigns.front?.customText,
          uploadedImageLength: allDesigns.front?.uploadedImage?.length,
        },
        back: {
          hasUploadedImage: !!allDesigns.back?.uploadedImage,
          hasCustomText: !!allDesigns.back?.customText,
          customText: allDesigns.back?.customText,
          uploadedImageLength: allDesigns.back?.uploadedImage?.length,
        },
        left: {
          hasUploadedImage: !!allDesigns.left?.uploadedImage,
          hasCustomText: !!allDesigns.left?.customText,
          customText: allDesigns.left?.customText,
          uploadedImageLength: allDesigns.left?.uploadedImage?.length,
        },
        right: {
          hasUploadedImage: !!allDesigns.right?.uploadedImage,
          hasCustomText: !!allDesigns.right?.customText,
          customText: allDesigns.right?.customText,
          uploadedImageLength: allDesigns.right?.uploadedImage?.length,
        },
      });

      // Assemble design doc - DO NOT include large preview images in payload
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
            // ⚠️ Preview images are stored in cart context, not sent to backend
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
        const response = await axios.get(`https://duco-67o5.onrender.com/api/printrove/mappings/${productDetails._id}`);
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
        isCorporate: productDetails?.isCorporate || false, // ✅ Add corporate flag from product details
        price: applyLocationPricing(
          productDetails?.pricing?.[0]?.price_per || 499,
          priceIncrease,
          conversionRate
        ),
        isLoadedDesign: true, // ✅ Mark as loaded design so cart doesn't re-apply location pricing
        quantity: finalQuantities,
        additionalFilesMeta: additionalFiles.map((f) => ({
          name: f.name,
          dataUrl: f.dataUrl, // ✅ Include the actual file data
          type: f.type,
          size: f.size,
        })),
      };

      // ✅ Log the design object being added to cart
      console.log("🧾 DESIGN OBJECT IN CART PRODUCT:", {
        design: {
          front: {
            hasUploadedImage: !!customProduct.design.front?.uploadedImage,
            hasCustomText: !!customProduct.design.front?.customText,
            customText: customProduct.design.front?.customText,
          },
          back: {
            hasUploadedImage: !!customProduct.design.back?.uploadedImage,
            hasCustomText: !!customProduct.design.back?.customText,
            customText: customProduct.design.back?.customText,
          },
          left: {
            hasUploadedImage: !!customProduct.design.left?.uploadedImage,
            hasCustomText: !!customProduct.design.left?.customText,
            customText: customProduct.design.left?.customText,
          },
          right: {
            hasUploadedImage: !!customProduct.design.right?.uploadedImage,
            hasCustomText: !!customProduct.design.right?.customText,
            customText: customProduct.design.right?.customText,
          },
        },
        previewImages: {
          front: customProduct.previewImages?.front ? `${customProduct.previewImages.front.substring(0, 50)}... (${customProduct.previewImages.front.length} chars)` : 'MISSING',
          back: customProduct.previewImages?.back ? `${customProduct.previewImages.back.substring(0, 50)}... (${customProduct.previewImages.back.length} chars)` : 'MISSING',
          left: customProduct.previewImages?.left ? `${customProduct.previewImages.left.substring(0, 50)}... (${customProduct.previewImages.left.length} chars)` : 'MISSING',
          right: customProduct.previewImages?.right ? `${customProduct.previewImages.right.substring(0, 50)}... (${customProduct.previewImages.right.length} chars)` : 'MISSING',
        }
      });

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
        },
        previewImages: {
          front: customProduct.previewImages?.front ? `${customProduct.previewImages.front.substring(0, 50)}... (${customProduct.previewImages.front.length} chars)` : 'MISSING',
          back: customProduct.previewImages?.back ? `${customProduct.previewImages.back.substring(0, 50)}... (${customProduct.previewImages.back.length} chars)` : 'MISSING',
          left: customProduct.previewImages?.left ? `${customProduct.previewImages.left.substring(0, 50)}... (${customProduct.previewImages.left.length} chars)` : 'MISSING',
          right: customProduct.previewImages?.right ? `${customProduct.previewImages.right.substring(0, 50)}... (${customProduct.previewImages.right.length} chars)` : 'MISSING',
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

      // ✅ VALIDATE FILES ARE UPLOADED (CRITICAL)
      if (additionalFiles.length === 0) {
        toast.error("❌ Please upload at least one CDR or PDF file for your design!");
        console.warn("⚠️ User tried to add to cart without uploading files");
        return;
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
          📎 Upload Additional CDR & PDF Files <span className="text-red-600">*REQUIRED</span>
        </h3>
        <p className="text-xs text-gray-600 mb-2">
          ⚠️ You must upload at least one CDR or PDF file to proceed with your order
        </p>
        <label className="flex flex-col items-center px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
          <span className="text-xs text-gray-600">
            Click to select CDR & PDF files (Max 5 files, 50MB each)
          </span>
          <input
            type="file"
            multiple
            accept=".cdr,.pdf"
            onChange={handleAdditionalFilesUpload}
            className="hidden"
          />
        </label>
        
        {/* File List with Remove Buttons */}
        {additionalFiles.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-blue-900">
                📁 Files Uploaded: {additionalFiles.length}/5
              </p>
              {additionalFiles.length > 0 && (
                <button
                  onClick={clearAllFiles}
                  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  Clear All
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {additionalFiles.map((fileObj, i) => (
                <li key={i} className="flex justify-between items-center p-2 bg-white rounded border border-blue-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate" title={fileObj.name}>
                      📄 {fileObj.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(fileObj.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => removeAdditionalFile(i)}
                    className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                    title="Remove this file"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Warning if no files */}
        {additionalFiles.length === 0 && (
          <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
            <p className="text-xs text-red-700 font-semibold">
              ⚠️ No files uploaded yet. You must upload at least one file to add to cart.
            </p>
          </div>
        )}
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
            type="text"
            inputMode="numeric"
            value={allDesigns[side].textSize === 0 ? "" : allDesigns[side].textSize}
            onChange={(e) => {
              const val = e.target.value;
              updateCurrentDesign("textSize", val === "" ? 0 : Number(val));
            }}
            placeholder="0"
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
        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-300 design-area-container ${isActive
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
          src={sideimage[getViewIndex(view)] && sideimage[getViewIndex(view)] !== '' ? sideimage[getViewIndex(view)] : menstshirt}
          alt={`${view} T-shirt`}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-0 ${view === 'back' ? 'scale-x-[-1]' : // Flip horizontally for back view
              view === 'left' ? 'rotate-[-10deg]' : // Slight rotation for left view
                view === 'right' ? 'rotate-[10deg]' : // Slight rotation for right view
                  '' // No transform for front view
            }`}
          crossOrigin="anonymous"
          onError={(e) => {
            console.error(`❌ Failed to load T-shirt image for ${view}:`, e.target.src);
            console.log("🔄 Falling back to default T-shirt image");
            e.target.src = menstshirt; // Fallback to default image
          }}
          onLoad={(e) => {
            console.log(`✅ T-shirt image loaded for ${view}:`, e.target.src);
            console.log(`🔍 Image source debug:`, {
              view,
              viewIndex: getViewIndex(view),
              sideimageArray: sideimage,
              actualSrc: sideimage[getViewIndex(view)],
              fallbackSrc: menstshirt
            });
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
                  width: `${isMobile ? design.imageSize * 0.7 : design.imageSize
                    }px`,
                  height: `${isMobile ? design.imageSize * 0.7 : design.imageSize
                    }px`,
                  pointerEvents: "none", // Let parent handle events
                }}
                className="object-contain"
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
                  fontSize: `${isMobile ? design.textSize * 0.8 : design.textSize
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

      <div className="flex flex-col lg:flex-row w-full min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-80 bg-white shadow-xl p-6 border-r border-gray-300 overflow-y-auto">
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
                ).toLocaleString('en-IN')}
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
            className="mt-6 py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg w-full"
          >
            Submit <MdNavigateNext size={20} className="ml-2 inline" />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col w-full lg:overflow-hidden">
          {/* View Switcher - Above T-shirt */}
          <div className="flex-shrink-0 flex justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white lg:bg-gray-50 border-b border-gray-200">
            {views.map((view) => (
              <button
                key={view}
                onClick={() => {
                  console.log(`🔄 Switching from ${side} to ${view}`);
                  console.log(`📋 Current allDesigns state:`, {
                    front: { hasUploadedImage: !!allDesigns.front?.uploadedImage, hasCustomText: !!allDesigns.front?.customText },
                    back: { hasUploadedImage: !!allDesigns.back?.uploadedImage, hasCustomText: !!allDesigns.back?.customText },
                    left: { hasUploadedImage: !!allDesigns.left?.uploadedImage, hasCustomText: !!allDesigns.left?.customText },
                    right: { hasUploadedImage: !!allDesigns.right?.uploadedImage, hasCustomText: !!allDesigns.right?.customText },
                  });
                  setSide(view);
                }}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium transition-all rounded ${side === view
                    ? "bg-yellow-500 text-black"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          {/* T-shirt Preview Area */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-3 lg:p-4 bg-white lg:bg-gray-50 overflow-y-auto lg:overflow-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="relative w-full max-w-2xl h-auto aspect-square sm:aspect-auto sm:h-72 md:h-80 lg:h-full rounded-xl lg:rounded-2xl mx-auto" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>

              {/* Loading State */}
              {isLoadingProduct ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl lg:rounded-3xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm">Loading T-shirt...</p>
                  </div>
                </div>
              ) : (
                views.map((view) => (
                  <div key={view}>{renderDesignArea(view)}</div>
                ))
              )}
            </div>
          </div>

          {/* Mobile Controls Panel - Scrollable */}
          {isMobile && activeTab !== "none" && (
            <div className="flex-shrink-0 bg-white border-t border-gray-300 p-3 max-h-40 overflow-y-auto">
              <div className="space-y-2">
                {activeTab === "upload" && (
                  <>
                    <h3 className="text-xs font-semibold text-gray-800">Upload Logo</h3>
                    <label className="flex flex-col items-center px-2 py-1 bg-gray-50 rounded border border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
                      <span className="text-xs text-gray-600">Click to upload</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {allDesigns[side].uploadedImage && (
                      <>
                        <h3 className="text-xs font-semibold text-gray-800 mt-1">Logo Size</h3>
                        <input type="range" min="50" max="300" value={allDesigns[side].imageSize} onChange={(e) => updateCurrentDesign("imageSize", Number(e.target.value))} className="w-full h-1" />
                      </>
                    )}
                  </>
                )}

                {activeTab === "text" && (
                  <>
                    <h3 className="text-xs font-semibold text-gray-800">Custom Text</h3>
                    <input type="text" value={allDesigns[side].customText} onChange={(e) => updateCurrentDesign("customText", e.target.value)} placeholder="Enter text" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs text-gray-600 block">Size</label>
                        <input type="text" inputMode="numeric" value={allDesigns[side].textSize === 0 ? "" : allDesigns[side].textSize} onChange={(e) => {
                          const val = e.target.value;
                          updateCurrentDesign("textSize", val === "" ? 0 : Number(val));
                        }} placeholder="0" className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block">Color</label>
                        <input type="color" value={allDesigns[side].textColor} onChange={(e) => updateCurrentDesign("textColor", e.target.value)} className="w-full h-6 border border-gray-300 rounded cursor-pointer" />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "font" && (
                  <>
                    <h3 className="text-xs font-semibold text-gray-800">Font</h3>
                    <select value={allDesigns[side].font} onChange={(e) => updateCurrentDesign("font", e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs">
                      <option value="font-sans">Sans Serif</option>
                      <option value="font-serif">Serif</option>
                      <option value="font-mono">Monospace</option>
                    </select>
                  </>
                )}

                {activeTab === "additional" && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800">Upload Files</h3>
                    <label className="flex flex-col items-center px-3 py-2 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer transition-all">
                      <span className="text-xs text-gray-600">Click to select files</span>
                      <input type="file" multiple accept=".cdr,.pdf" onChange={handleAdditionalFilesUpload} className="hidden" />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Custom Text
                    </h3>
        {/* Mobile Bottom Bar */}
        <div className="flex-shrink-0 bg-gray-800 text-white flex justify-around py-1 border-t border-gray-700 lg:hidden">
          <button onClick={() => setActiveTab("upload")} className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded text-xs ${activeTab === "upload" ? "bg-yellow-500 text-black" : "hover:bg-gray-700"}`}>
            <FaUpload size={14} />
            <span className="text-[10px]">Upload</span>
          </button>
          <button onClick={() => setActiveTab("text")} className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded text-xs ${activeTab === "text" ? "bg-yellow-500 text-black" : "hover:bg-gray-700"}`}>
            <FaRegKeyboard size={14} />
            <span className="text-[10px]">Text</span>
          </button>
          <button onClick={() => setActiveTab("font")} className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded text-xs ${activeTab === "font" ? "bg-yellow-500 text-black" : "hover:bg-gray-700"}`}>
            <FaFont size={14} />
            <span className="text-[10px]">Font</span>
          </button>
          <button onClick={() => setActiveTab("additional")} className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded text-xs ${activeTab === "additional" ? "bg-yellow-500 text-black" : "hover:bg-gray-700"}`}>
            <FaUpload size={14} />
            <span className="text-[10px]">Files</span>
          </button>
          <button onClick={() => setActiveTab("none")} className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded text-xs ${activeTab === "none" ? "bg-yellow-500 text-black" : "hover:bg-gray-700"}`}>
            <FaTimes size={14} />
            <span className="text-[10px]">Close</span>
          </button>
        </div>

        {/* Mobile Submit Button */}
        <button onClick={saveSelectedViews} className="lg:hidden w-full py-2 px-3 bg-green-600 text-white font-semibold hover:bg-green-700 text-sm">
          Submit Design ✓
        </button>
        </>
      )}
    </>
  );
};

export default TshirtDesigner;
