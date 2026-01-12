import React from 'react';
import { useNavigate } from 'react-router-dom';

const DesignPreviewModal = ({id,selectedDesign, onClose ,addtocart ,size , color ,colortext,price,gender, minOrderQty = 100 }) => {
  if (!selectedDesign) return null;
  console.log(colortext)

  console.log(price)
 const navigator = useNavigate()
 
 // Calculate total quantity
 const getTotalQty = () => {
   return Object.values(size || {}).reduce((sum, q) => sum + Number(q || 0), 0);
 };

  // ✅ Helper to check if image is blank (data URL < 5KB)
  const isBlankImage = (src) => {
    if (!src) return true;
    if (typeof src !== 'string') return true;
    // Increased threshold from 2000 to 5000 to catch more blank images
    if (src.startsWith('data:') && src.length < 5000) return true;
    return false;
  };

  // ✅ Get preview images from the design object
  // Design structure from API: { _id, design: [...], previewImages: {front, back, left, right}, ... }
  const getPreviewImages = () => {
    console.log('🔍 DesignPreviewModal - selectedDesign structure:', {
      hasDesign: !!selectedDesign.design,
      hasPreviewImages: !!selectedDesign.previewImages,
      previewImagesKeys: selectedDesign.previewImages ? Object.keys(selectedDesign.previewImages) : [],
      previewImagesFront: selectedDesign.previewImages?.front ? `✅ ${selectedDesign.previewImages.front.length} chars` : '❌ MISSING',
    });

    // ✅ Priority 1: Use previewImages from top level (from API)
    if (selectedDesign.previewImages && typeof selectedDesign.previewImages === 'object') {
      const images = [];
      const views = ['front', 'back', 'left', 'right'];
      
      views.forEach(view => {
        const img = selectedDesign.previewImages[view];
        // ✅ CRITICAL: Check if image is valid (not empty, not "MISSING" string, not blank data URL)
        if (img && typeof img === 'string' && img !== 'MISSING' && !isBlankImage(img)) {
          images.push({
            url: img,
            view: view.charAt(0).toUpperCase() + view.slice(1),
            isValid: true
          });
        }
      });

      if (images.length > 0) {
        console.log('✅ Using previewImages from API response:', images.length, 'images');
        return images;
      }
    }

    // Fallback: if design array has items with previewImages (nested structure)
    if (Array.isArray(selectedDesign.design) && selectedDesign.design.length > 0) {
      const firstItem = selectedDesign.design[0];
      
      // Check if first item has previewImages (nested structure)
      if (firstItem.previewImages && typeof firstItem.previewImages === 'object') {
        const images = [];
        const views = ['front', 'back', 'left', 'right'];
        
        views.forEach(view => {
          const img = firstItem.previewImages[view];
          // ✅ CRITICAL: Check if image is valid
          if (img && typeof img === 'string' && img !== 'MISSING' && !isBlankImage(img)) {
            images.push({
              url: img,
              view: view.charAt(0).toUpperCase() + view.slice(1),
              isValid: true
            });
          }
        });

        if (images.length > 0) {
          console.log('✅ Using previewImages from design[0]:', images.length, 'images');
          return images;
        }
      }

      // Check if items have url property
      if (firstItem.url && !isBlankImage(firstItem.url)) {
        console.log('✅ Using url from design array items');
        return selectedDesign.design.map((item, index) => ({
          url: item.url,
          view: item.view || ['Front', 'Back', 'Left', 'Right'][index] || `View ${index + 1}`,
          isValid: true
        }));
      }
    }

    console.warn('⚠️ No valid preview images found in design');
    return [];
  };

  const previewImages = getPreviewImages();

  // ✅ Get additional files (PDF and CDR) from the design
  const getAdditionalFiles = () => {
    console.log('🔍 Looking for additional files in design:', {
      hasDesign: !!selectedDesign.design,
      designArray: selectedDesign.design,
      designArrayLength: Array.isArray(selectedDesign.design) ? selectedDesign.design.length : 0,
      firstItemKeys: Array.isArray(selectedDesign.design) && selectedDesign.design.length > 0 ? Object.keys(selectedDesign.design[0]) : [],
    });

    // Try multiple locations where files might be stored
    let files = [];
    
    // Priority 1: selectedDesign.design[0].additionalFilesMeta (nested in design array)
    if (Array.isArray(selectedDesign.design) && selectedDesign.design.length > 0) {
      const firstItem = selectedDesign.design[0];
      if (Array.isArray(firstItem.additionalFilesMeta) && firstItem.additionalFilesMeta.length > 0) {
        files = firstItem.additionalFilesMeta;
        console.log('✅ Found files in design[0].additionalFilesMeta:', files);
        return files;
      }
    }
    
    // Priority 2: selectedDesign.additionalFilesMeta (top level)
    if (Array.isArray(selectedDesign.additionalFilesMeta) && selectedDesign.additionalFilesMeta.length > 0) {
      files = selectedDesign.additionalFilesMeta;
      console.log('✅ Found files in selectedDesign.additionalFilesMeta:', files);
      return files;
    }
    
    // Priority 3: selectedDesign.additionalFiles (alternative name)
    if (Array.isArray(selectedDesign.additionalFiles) && selectedDesign.additionalFiles.length > 0) {
      files = selectedDesign.additionalFiles;
      console.log('✅ Found files in selectedDesign.additionalFiles:', files);
      return files;
    }

    console.warn('⚠️ No additional files found in design');
    return [];
  };

  const additionalFiles = getAdditionalFiles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-3xl mx-auto text-center overflow-y-auto max-h-[90vh]">

        <div className='flex items-center mb-6  justify-between'>
                   <h2 className="text-xl font-bold ">Design Preview</h2>
         <button
          onClick={onClose}
          className=" bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close Preview
        </button>
        </div>
       

        {/* Preview container */}
     
          {/* T-shirt Base (optional background) */}
         

          {/* Display each design element in clean stacked layout */}
          <div className="w-full flex flex-col items-center gap-4 ">
            {previewImages.length > 0 ? (
              previewImages.map((item, index) => (
                <div key={index} className="text-center">
                  <>
                    <img
                      src={item.url}
                      alt={`${item.view} Design`}
                      className="mx-auto rounded-md shadow-md max-w-[400px]"
                      aria-placeholder='Design Image'
                      onError={(e) => {
                        console.error('❌ Design image failed to load:', item.url);
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f0f0f0' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23999' text-anchor='middle' dy='.3em'%3EImage not available%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <span className='text-sm font-black'>{item.view}</span>
                  </>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No preview images available</p>
                <div className="bg-gray-100 rounded-md p-8 max-w-[400px] mx-auto">
                  <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200' className="mx-auto">
                    <rect fill='#f0f0f0' width='200' height='200'/>
                    <text x='50%' y='50%' fontSize='16' fill='#999' textAnchor='middle' dy='.3em'>No images</text>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Display Additional Files (PDF & CDR) */}
          {additionalFiles.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-300">
              <h3 className="text-lg font-bold mb-4 text-gray-800">📎 Uploaded Design Files</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {additionalFiles.map((file, index) => {
                  const fileType = file.name?.toLowerCase().endsWith('.cdr') ? 'CDR' : 'PDF';
                  const fileSize = file.size ? (file.size / 1024).toFixed(2) : 'N/A';
                  
                  console.log(`📄 File ${index}:`, {
                    name: file.name,
                    type: fileType,
                    size: fileSize,
                    hasDataUrl: !!file.dataUrl,
                    hasFile: !!file.file
                  });
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                      <div className="flex-shrink-0">
                        {fileType === 'CDR' ? (
                          <div className="w-10 h-10 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">
                            CDR
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">
                            PDF
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {fileType} • {fileSize} KB
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
     

        <button
          onClick={onClose}
          className="mt-6 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close Preview
        </button>
         <button

          onClick={()=>{ 
           console.log('🛒 Adding design to cart:', {
             selectedDesign,
             previewImages,
             additionalFiles,
             designData: selectedDesign.design,
             productId: selectedDesign.products,
             productName: selectedDesign.cutomerprodcuts
           });

           // ✅ Extract product details from selectedDesign
           const productId = selectedDesign.products || selectedDesign.productId || id;
           const productName = selectedDesign.cutomerprodcuts || selectedDesign.products_name || 'Custom T-Shirt';
           
           // ✅ Create cart item with all necessary data
           // ✅ CRITICAL: Ensure quantity is an object with size keys
           const quantityObj = typeof size === 'object' && size !== null ? size : { 'One Size': 1 };
           
           const cartItem = {
             id: `loaded-design-${selectedDesign._id}-${Date.now()}`, // Unique ID for loaded design
             productId: productId,
             products_name: productName,
             name: productName,
             design: selectedDesign.design, // Full design array from API
             previewImages: selectedDesign.previewImages || previewImages, // Use API previewImages or extracted ones
             additionalFilesMeta: additionalFiles, // ✅ Include files metadata
             color: color,
             colortext: colortext,
             quantity: quantityObj, // ✅ FIXED: Ensure this is an object with size keys
             price: price, // ✅ This should already have location pricing applied
             gender: selectedDesign.gender || 'Unisex',
             isBulkProduct: true,
             isCorporate: true,
             category: 'Corporate T-Shirt',
             // ✅ Add metadata for tracking
             isLoadedDesign: true,
             originalDesignId: selectedDesign._id,
             createdAt: selectedDesign.createdAt
           };

           console.log('🧾 Cart item to add:', {
             id: cartItem.id,
             name: cartItem.name,
             hasPreviewImages: !!cartItem.previewImages,
             previewImagesFront: cartItem.previewImages?.front ? `✅ ${cartItem.previewImages.front.length} chars` : '❌ MISSING',
             hasAdditionalFiles: cartItem.additionalFilesMeta?.length > 0,
             filesCount: cartItem.additionalFilesMeta?.length || 0,
             price: cartItem.price
           });

           // ✅ CRITICAL: Include all necessary fields for cart
           const completeCartItem = {
             ...cartItem,
             // ✅ Include additional files
             additionalFilesMeta: additionalFiles,
             // ✅ Fix design structure - convert array to object if needed
             design: Array.isArray(selectedDesign.design) && selectedDesign.design.length > 0
               ? selectedDesign.design[0]
               : selectedDesign.design,
             // ✅ Use product ID as cart item ID (not design ID)
             id: selectedDesign.products || selectedDesign.productId || id,
             // ✅ Include product details for pricing and display
             products_name: selectedDesign.cutomerprodcuts || selectedDesign.products_name || 'Custom T-Shirt',
             // ✅ Include product pricing array for calculations
             pricing: selectedDesign.pricing || [],
             // ✅ Include product images as fallback
             image_url: selectedDesign.image_url || [],
             // ✅ CRITICAL: Include price (was missing!)
             price: price || 0,
             // ✅ Mark as loaded design for tracking
             isLoadedDesign: true,
             originalDesignId: selectedDesign._id,
           };

           console.log('🧾 Complete cart item with all fields:', {
             id: completeCartItem.id,
             name: completeCartItem.products_name,
             price: completeCartItem.price,
             hasPreviewImages: !!completeCartItem.previewImages,
             hasAdditionalFiles: completeCartItem.additionalFilesMeta?.length > 0,
             hasDesign: !!completeCartItem.design,
             hasPricing: completeCartItem.pricing?.length > 0,
             hasProductImages: completeCartItem.image_url?.length > 0,
           });

           addtocart(completeCartItem);

                onClose();
                navigator("/cart")
          } }

          className="mt-6  ml-10 bg-green-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
            Confirm Design
        </button>
      </div>
    </div>
  );
};

export default DesignPreviewModal;
