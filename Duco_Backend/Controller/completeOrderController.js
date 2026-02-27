const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');
const Design = require('../DataBase/Models/DesignModel');
const Product = require('../DataBase/Models/ProductsModel');
const CorporateSettings = require('../DataBase/Models/CorporateSettings');
const { createInvoice, getInvoiceByOrderId } = require('./invoiceService');
const { getOrCreateSingleton } = require('../Router/DataRoutes');
const { createTransaction } = require('./walletController');
const { calculateOrderTotal } = require('../Service/TaxCalculationService');
const fs = require('fs').promises;
const LZString = require('lz-string'); // ✅ added for decompression
const { uploadDesignPreviewImages } = require('../utils/cloudinaryUpload'); // ✅ Cloudinary upload
const aiSensyService = require('../Service/AiSensyService'); // ✅ AiSensy WhatsApp notifications
const emailService = require('../Service/EmailService'); // ✅ Email notifications
const invoicePdfService = require('../Service/InvoicePDFService'); // ✅ Invoice PDF generation

// --- Razorpay client ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Helpers ---
function safeNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

// ✅ Helper to get estimated delivery date based on settings
async function getEstimatedDeliveryDate() {
  try {
    const settings = await CorporateSettings.findOne();
    const deliveryDays = settings?.estimatedDeliveryDays || 7;
    const date = new Date();
    date.setDate(date.getDate() + deliveryDays);
    console.log(`📅 Estimated delivery date set to: ${deliveryDays} days from now`);
    return date;
  } catch (err) {
    console.error('Error fetching delivery days setting, using default 7 days:', err);
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }
}

function sumQuantity(obj) {
  return Object.values(obj || {}).reduce((acc, q) => acc + safeNum(q, 0), 0);
}

// ✅ Helper: Check if value is base64 image data
function isBase64Image(value) {
  if (typeof value !== 'string') return false;
  
  // ✅ Check for data URL format (data:image/...)
  if (value.startsWith('data:image/')) return true;
  
  // ✅ Check for explicit base64 encoding
  if (value.includes('base64,')) return true;
  
  // ✅ Check for base64 pattern: Long string with specific base64 characteristics
  // Base64 uses A-Z, a-z, 0-9, +, /, = characters
  // For images, usually > 1000 chars and contains = padding at end
  if (value.length > 1000 && 
      !value.startsWith('http') && 
      !value.startsWith('/') &&
      !value.startsWith('.') &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return true;
  }
  
  return false;
}

// ✅ Helper: Recursively remove base64 from any object/array
function stripBase64Deep(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripBase64Deep(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const cleaned = {};
    Object.entries(value).forEach(([key, val]) => {
      // Skip base64 fields entirely
      if (isBase64Image(val)) {
        return;
      }
      const next = stripBase64Deep(val);
      if (next !== undefined) {
        cleaned[key] = next;
      }
    });
    return cleaned;
  }

  // Remove base64 strings
  if (isBase64Image(value)) {
    return undefined;
  }

  return value;
}

// ✅ Clean items array: Remove ALL base64 data from products
function cleanItemsForDatabase(items) {
  if (!Array.isArray(items)) return [];
  
  console.log('🧹 Cleaning items array - removing base64 data...');
  
  const cleaned = items.map((item, index) => {
    const cleanedItem = stripBase64Deep(item);
    
    // Log what was cleaned
    const originalSize = JSON.stringify(item).length;
    const cleanedSize = JSON.stringify(cleanedItem).length;
    const savedBytes = originalSize - cleanedSize;
    
    if (savedBytes > 1000) {
      console.log(`  ✅ Item ${index}: Removed ${(savedBytes / 1024).toFixed(1)} KB of base64 data`);
    }
    
    return cleanedItem;
  });
  
  console.log('✅ Items cleaned successfully');
  return cleaned;
}

// ✅ MANDATORY: Remove ALL base64 data from order after Cloudinary upload
async function removeBase64FromOrder(orderId) {
  try {
    console.log(`🧹 Removing base64 images from order ${orderId} (post-upload cleanup)`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      console.warn(`⚠️ Order ${orderId} not found for base64 cleanup`);
      return;
    }

    // ✅ Clean the products/items array
    if (order.products && Array.isArray(order.products)) {
      const originalSize = JSON.stringify(order.products).length;
      order.products = order.products.map(product => stripBase64Deep(product));
      const newSize = JSON.stringify(order.products).length;
      const removedBytes = originalSize - newSize;
      
      if (removedBytes > 0) {
        console.log(`  ✅ Removed ${(removedBytes / 1024).toFixed(1)} KB of base64 from products`);
      }
    }

    // ✅ Clean the items array (if present - for backward compatibility)
    if (order.items && Array.isArray(order.items)) {
      const originalSize = JSON.stringify(order.items).length;
      order.items = order.items.map(item => stripBase64Deep(item));
      const newSize = JSON.stringify(order.items).length;
      const removedBytes = originalSize - newSize;
      
      if (removedBytes > 0) {
        console.log(`  ✅ Removed ${(removedBytes / 1024).toFixed(1)} KB of base64 from items`);
      }
    }

    await order.save();
    console.log(`✅ Base64 data removed from order ${orderId}`);
  } catch (error) {
    console.error(`❌ Error removing base64 from order ${orderId}:`, error.message);
  }
}

// ✅ STRICT VALIDATION: Ensure no empty products objects
function validateProductsArray(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Order must contain at least one product' };
  }

  for (let i = 0; i < items.length; i++) {
    const product = items[i];
    
    // ❌ HARD GUARD: Detect empty objects
    if (!product || typeof product !== 'object' || Object.keys(product).length === 0) {
      return { 
        valid: false, 
        error: `Product at index ${i} is empty or invalid` 
      };
    }

    // ❌ REQUIRED: Product ID
    const productId = product.product || product.productId || product._id || product.id;
    if (!productId) {
      return { 
        valid: false, 
        error: `Product at index ${i} missing product ID` 
      };
    }

    // ❌ REQUIRED: Product name
    const productName = product.products_name || product.name;
    if (!productName || typeof productName !== 'string') {
      return { 
        valid: false, 
        error: `Product at index ${i} missing product name` 
      };
    }

    // ❌ REQUIRED: Quantity
    const hasQuantity = product.quantity && 
      (typeof product.quantity === 'number' || 
       (typeof product.quantity === 'object' && Object.keys(product.quantity).length > 0));
    
    if (!hasQuantity) {
      return { 
        valid: false, 
        error: `Product at index ${i} missing valid quantity` 
      };
    }

    // ❌ REQUIRED: Price
    const price = safeNum(product.price, -1);
    if (price < 0) {
      return { 
        valid: false, 
        error: `Product at index ${i} missing valid price` 
      };
    }

    // ❌ OPTIONAL BUT RECOMMENDED: Image source
    const hasImage = 
      product.previewImages?.front ||
      product.design?.frontView ||
      product.image_url?.[0]?.url?.[0] ||
      product.image;

    if (!hasImage) {
      console.warn(`⚠️ Product at index ${i} has no image source (will use placeholder)`);
    }
  }

  return { valid: true };
}

// ✅ Helper to detect currency from country
function getCurrencyFromCountry(country) {
  if (!country) return 'INR';
  
  const countryLower = country.toLowerCase().trim();
  
  const countryCurrencyMap = {
    'india': 'INR',
    'united states': 'USD',
    'usa': 'USD',
    'united kingdom': 'GBP',
    'uk': 'GBP',
    'europe': 'EUR',
    'germany': 'EUR',
    'france': 'EUR',
    'spain': 'EUR',
    'italy': 'EUR',
    'netherlands': 'EUR',
    'belgium': 'EUR',
    'austria': 'EUR',
    'portugal': 'EUR',
    'greece': 'EUR',
    'ireland': 'EUR',
    'uae': 'AED',
    'dubai': 'AED',
    'united arab emirates': 'AED',
    'australia': 'AUD',
    'canada': 'CAD',
    'singapore': 'SGD',
    'new zealand': 'NZD',
    'switzerland': 'CHF',
    'japan': 'JPY',
    'china': 'CNY',
    'hong kong': 'HKD',
    'malaysia': 'MYR',
    'thailand': 'THB',
    'saudi arabia': 'SAR',
    'qatar': 'QAR',
    'kuwait': 'KWD',
    'bahrain': 'BHD',
    'oman': 'OMR',
    'south africa': 'ZAR',
    'pakistan': 'PKR',
    'sri lanka': 'LKR',
    'bangladesh': 'BDT',
    'nepal': 'NPR',
    'philippines': 'PHP',
    'indonesia': 'IDR',
    'south korea': 'KRW',
    'korea': 'KRW',
  };
  
  return countryCurrencyMap[countryLower] || 'INR';
}

function buildInvoiceItems(products, { hsn = '7307', unit = 'Pcs.' } = {}) {
  const items = [];
  (products || []).forEach((p) => {
    const qty = sumQuantity(p.quantity);
    if (!qty) return;
    
    // ✅ CRITICAL FIX: Use p.price (cart-calculated price in customer currency)
    // DO NOT use pricing array - that's the base INR price from product catalog
    // Cart already calculated the correct price considering:
    // - Location-based pricing
    // - Currency conversion
    // - Bulk discounts
    const itemPrice = safeNum(p.price, 0);
    
    console.log(`📦 Invoice item: ${p.products_name || p.name || 'Item'} - Price: ${itemPrice} (from cart calculation)`);
    
    items.push({
      description: p.products_name || p.name || 'Item',
      barcode: p._id || '',
      hsn,
      qty,
      unit,
      price: itemPrice,
    });
  });
  return items;
}

// ✅ Extract design preview images from first product
async function extractAndUploadDesignImages(products, orderId) {
  try {
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('⚠️ No products found for design extraction');
      return {};
    }

    const firstProduct = products[0];
    const previewImages = {};

    console.log('🔍 Extracting design images from product:', {
      hasPreviewImages: !!firstProduct.previewImages,
      hasDesign: !!firstProduct.design,
      previewImagesKeys: firstProduct.previewImages ? Object.keys(firstProduct.previewImages) : [],
      designKeys: firstProduct.design ? Object.keys(firstProduct.design) : [],
      designType: Array.isArray(firstProduct.design) ? 'array' : typeof firstProduct.design,
    });

    // ✅ CRITICAL: Check for previewImages at top level first (from loaded designs)
    if (firstProduct.previewImages && typeof firstProduct.previewImages === 'object') {
      console.log('📸 Found previewImages at top level (from loaded design)');
      for (const [key, value] of Object.entries(firstProduct.previewImages)) {
        if (value && typeof value === 'string' && value.length > 100) {
          previewImages[key] = value;
          console.log(`  ✅ ${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
        }
      }
    }

    // Check for preview images in product design
    let designObj = firstProduct.design;
    
    // ✅ CRITICAL FIX: Handle design as array (from TShirtDesigner - new designs)
    if (Array.isArray(designObj) && designObj.length > 0) {
      console.log('📸 Design is an array, using first element');
      designObj = designObj[0];
    }
    // ✅ If design is already an object (loaded designs), use it directly
    else if (designObj && typeof designObj === 'object' && !Array.isArray(designObj)) {
      console.log('📸 Design is an object (loaded design)');
    }
    
    if (designObj && typeof designObj === 'object') {
      // Extract preview images from design object
      if (designObj.previewImages && typeof designObj.previewImages === 'object') {
        console.log('📸 Found previewImages in design object');
        for (const [key, value] of Object.entries(designObj.previewImages)) {
          if (value && typeof value === 'string' && value.length > 100 && !previewImages[key]) {
            previewImages[key] = value;
            console.log(`  ✅ ${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
          }
        }
      }
      
      // ✅ CRITICAL FIX: Check for direct front/back/left/right (multiple patterns)
      for (const view of ['front', 'back', 'left', 'right']) {
        if (previewImages[view]) continue; // Skip if already found
        
        const viewData = designObj[view];
        
        // Pattern 1: Direct base64 string
        if (typeof viewData === 'string' && viewData.length > 100) {
          previewImages[view] = viewData;
          console.log(`  ✅ ${view} (direct string): ${viewData.substring(0, 50)}... (${viewData.length} chars)`);
        }
        // Pattern 2: Object with uploadedImage (FROM TSHIRTDESIGNER)
        else if (viewData && typeof viewData === 'object' && viewData.uploadedImage && typeof viewData.uploadedImage === 'string' && viewData.uploadedImage.length > 100) {
          previewImages[view] = viewData.uploadedImage;
          console.log(`  ✅ ${view} (from uploadedImage): ${viewData.uploadedImage.substring(0, 50)}... (${viewData.uploadedImage.length} chars)`);
        }
        // Pattern 3: Object with url
        else if (viewData && typeof viewData === 'object' && viewData.url && typeof viewData.url === 'string' && viewData.url.length > 100) {
          previewImages[view] = viewData.url;
          console.log(`  ✅ ${view} (from url): ${viewData.url.substring(0, 50)}...`);
        }
      }
    }

    // If we found preview images, upload them to Cloudinary
    if (Object.keys(previewImages).length > 0) {
      console.log('📸 Found preview images, uploading to Cloudinary...', {
        count: Object.keys(previewImages).length,
        views: Object.keys(previewImages),
        sizes: Object.keys(previewImages).map(view => ({
          view,
          size: previewImages[view] ? `${(previewImages[view].length / 1024).toFixed(2)} KB` : 'null'
        }))
      });
      
      const uploadedImages = await uploadDesignPreviewImages(previewImages, orderId);
      
      console.log('✅ Cloudinary upload result:', {
        uploadedCount: Object.keys(uploadedImages).length,
        uploadedViews: Object.keys(uploadedImages),
        allAreUrls: Object.values(uploadedImages).every(url => url && url.startsWith('http'))
      });
      
      return uploadedImages;
    }

    console.log('⚠️ No preview images found in product design');
    console.log('📋 First product structure:', {
      keys: Object.keys(firstProduct),
      hasPreviewImages: !!firstProduct.previewImages,
      hasDesign: !!firstProduct.design,
      designIsArray: Array.isArray(firstProduct.design),
      designStructure: designObj ? {
        keys: Object.keys(designObj),
        hasFront: !!designObj.front,
        hasBack: !!designObj.back,
        hasLeft: !!designObj.left,
        hasRight: !!designObj.right,
        frontType: typeof designObj.front,
        frontHasUploadedImage: designObj.front && typeof designObj.front === 'object' ? !!designObj.front.uploadedImage : false,
      } : null
    });
    return {};
  } catch (error) {
    console.error('❌ Error extracting/uploading design images:', error.message);
    return {};
  }
}

function formatDateDDMMYYYY(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function normalizeColorName(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeColorHex(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  return /^[0-9a-f]{6}$/.test(hex) ? `#${hex}` : '';
}

function normalizeSizeKey(value) {
  const raw = String(value || '').trim().toUpperCase();
  const cleaned = raw.replace(/\s+/g, '').replace(/-/g, '');
  if (['XXL', '2XL', '2X'].includes(cleaned)) return '2XL';
  if (['XXXL', '3XL', '3X'].includes(cleaned)) return '3XL';
  return cleaned;
}

function colorMatches(item, imageItem) {
  const candidates = [
    item?.color,
    item?.colorcode,
    item?.colorCode,
    item?.colortext,
  ].filter(Boolean);

  const itemNameTokens = candidates.map(normalizeColorName).filter(Boolean);
  const itemHexTokens = candidates.map(normalizeColorHex).filter(Boolean);

  const imageName = normalizeColorName(imageItem?.color);
  const imageHex = normalizeColorHex(imageItem?.colorcode);

  const nameMatch = itemNameTokens.some((token) =>
    token === imageName || token.includes(imageName) || imageName.includes(token)
  );
  const hexMatch = itemHexTokens.some((token) => token === imageHex);

  return nameMatch || hexMatch;
}

// ✅ Stock Reduction Helper
async function reduceProductStock(items) {
  console.log('📦 Starting stock reduction for order items...');
  
  for (const item of items) {
    try {
      const productId = item.product || item.productId || item._id || item.id;
      if (!productId) {
        console.warn('⚠️ Skipping item - no product ID found:', item);
        continue;
      }

      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`⚠️ Product not found: ${productId}`);
        continue;
      }

      const color = item.color;
      const quantityObj = item.quantity || {};

      console.log(`📦 Reducing stock for: ${product.products_name}`, {
        color,
        quantityObj,
        currentStock: product.Stock
      });

      // Normalize color for case-insensitive comparison
      // Find the matching color in product's image_url array
      let colorFound = false;
      let colorItem = null;

      for (const imageItem of product.image_url) {
        if (colorMatches(item, imageItem)) {
          colorFound = true;
          colorItem = imageItem;
          break;
        }
      }

      if (!colorFound) {
        console.warn(`⚠️ Color not found for product: ${product.products_name}`);
        continue;
      }

      // Reduce stock for each size in the quantity object
      let anyStockReduced = false;
      for (const [size, qty] of Object.entries(quantityObj)) {
        const quantity = safeNum(qty, 0);
        if (quantity <= 0) continue;
        const normalizedSize = normalizeSizeKey(size);
        if (!normalizedSize) continue;

        for (const contentItem of colorItem.content) {
          const contentSize = normalizeSizeKey(contentItem.size);
          if (contentSize === normalizedSize) {
            const currentStock = contentItem.minstock || 0;
            const newStock = Math.max(0, currentStock - quantity);
            
            console.log(`  ✅ Found matching size: ${size}, reducing from ${currentStock} to ${newStock}`);
            contentItem.minstock = newStock;
            anyStockReduced = true;
            break;
          }
        }
      }

      if (anyStockReduced) {
        // Save the product (this will trigger the pre-save hook to recalculate total Stock)
        await product.save();
        console.log(`✅ Stock reduced successfully for ${product.products_name} - New total stock: ${product.Stock}`);
      } else {
        console.warn(`⚠️ Could not find matching color/size combination for stock reduction:`, {
          productName: product.products_name,
          color,
          quantityObj
        });
      }
    } catch (error) {
      console.error(`❌ Error reducing stock for item:`, error.message);
      // Continue with other items even if one fails
    }
  }
  
  console.log('✅ Stock reduction completed');
}

// ✅ Stock Validation Helper
async function validateStock(items) {
  console.log('🔍 Validating stock for order items...');
  console.log('📦 Items received:', JSON.stringify(items, null, 2));
  const outOfStockItems = [];
  
  for (const item of items) {
    try {
      // ✅ Handle custom designed t-shirts that have image_url with stock info
      // These items may not have explicit quantity or color fields
      if (item.image_url && Array.isArray(item.image_url)) {
        console.log(`✅ Custom designed item detected: ${item.products_name || item.name}`);
        console.log(`   Has image_url with ${item.image_url.length} colors`);
        
        // For custom items with image_url, just verify that stock exists
        // The item is being sold as 1 unit regardless of which color/size combination
        let hasAvailableStock = false;
        
        for (const colorGroup of item.image_url) {
          if (colorGroup.content && Array.isArray(colorGroup.content)) {
            for (const sizeItem of colorGroup.content) {
              if (sizeItem.minstock > 0) {
                hasAvailableStock = true;
                break;
              }
            }
          }
          if (hasAvailableStock) break;
        }
        
        if (!hasAvailableStock) {
          outOfStockItems.push({
            name: item.products_name || item.name,
            reason: 'No stock available for any size/color combination'
          });
        }
        continue; // Skip to next item - custom items validated
      }

      // ✅ Original validation logic for regular products
      const productId = item.product || item.productId || item._id || item.id;
      if (!productId) {
        console.warn('⚠️ No product ID found in item:', item);
        continue;
      }

      const product = await Product.findById(productId);
      if (!product) {
        outOfStockItems.push({
          name: item.name || item.products_name || 'Unknown Product',
          reason: 'Product not found'
        });
        continue;
      }

      const color = item.color;
      const quantityObj = item.quantity || {};

      console.log(`🔍 Validating: ${product.products_name}`);
      console.log(`  Color (input): "${color}"`);
      console.log(`  Quantity object:`, quantityObj);

      // Normalize color for case-insensitive comparison
      const normalizedColor = typeof color === 'string' ? color.toLowerCase().trim() : '';

      console.log(`  Color (normalized): "${normalizedColor}"`);
      console.log(`  Available colors in product:`, product.image_url.map(img => ({
        color: img.color,
        colorcode: img.colorcode,
        sizes: img.content.map(c => ({ size: c.size, stock: c.minstock }))
      })));

      // Find the matching color in product's image_url array
      let colorFound = false;
      let colorItem = null;

      for (const imageItem of product.image_url) {
        if (colorMatches(item, imageItem)) {
          colorFound = true;
          colorItem = imageItem;
          console.log(`  ✅ Color match found: "${imageItem.color}" or "${imageItem.colorcode}"`);
          break;
        }
      }

      if (!colorFound) {
        console.log(`  ❌ Color not found in product`);
        outOfStockItems.push({
          name: product.products_name,
          color,
          reason: 'Color not available'
        });
        continue;
      }

      // Now validate each size in the quantity object
      for (const [size, qty] of Object.entries(quantityObj)) {
        const quantity = safeNum(qty, 0);
        if (quantity <= 0) continue; // Skip zero quantities
        const normalizedSize = normalizeSizeKey(size);
        if (!normalizedSize) continue;

        let sizeFound = false;
        let availableStock = 0;

        for (const contentItem of colorItem.content) {
          const contentSize = normalizeSizeKey(contentItem.size);
          if (contentSize === normalizedSize) {
            sizeFound = true;
            availableStock = contentItem.minstock || 0;
            console.log(`    ✅ Size match found: "${normalizedSize}", stock: ${availableStock}, needed: ${quantity}`);
            
            if (availableStock < quantity) {
              console.log(`    ❌ Insufficient stock: need ${quantity}, have ${availableStock}`);
              outOfStockItems.push({
                name: product.products_name,
                color,
                size,
                requested: quantity,
                available: availableStock,
                reason: 'Insufficient stock'
              });
            }
            break;
          }
        }

        if (!sizeFound) {
          console.log(`    ❌ Size "${size}" not found for this color`);
          outOfStockItems.push({
            name: product.products_name,
            color,
            size,
            reason: 'Size not available for this color'
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error validating stock for item:`, error.message);
      outOfStockItems.push({
        name: item.name || 'Unknown Product',
        reason: 'Validation error: ' + error.message
      });
    }
  }
  
  console.log('📊 Validation Result:', { outOfStockItems, passed: outOfStockItems.length === 0 });
  return outOfStockItems;
}

function addressToLine(a = {}) {
  const {
    fullName = '',
    houseNumber = '',
    street = '',
    landmark = '',
    city = '',
    state = '',
    pincode = '',
    country = '',
  } = a || {};
  return [
    fullName,
    houseNumber,
    street,
    landmark,
    city,
    state && `${state} - ${pincode}`,
    country,
  ]
    .filter(Boolean)
    .join(', ');
}

async function buildInvoiceArtifacts(order, req) {
  try {
    console.log('📄 Fetching invoice data...');
    const { invoice, totals } = await getInvoiceByOrderId(order._id);

    if (!invoice) {
      console.warn('⚠️ Invoice not found');
      return null;
    }

    // ✅ RECALCULATE grand total using correct formula (taxableValue + totalTaxAmt)
    // This ensures email shows correct amount even if DB has old incorrect value
    const recalculatedGrandTotal = Number((totals.taxableValue + totals.totalTaxAmt).toFixed(2));
    
    console.log('📊 Grand Total Calculation for Email:', {
      orderId: order.orderId || order._id,
      taxableValue: totals.taxableValue,
      totalTaxAmt: totals.totalTaxAmt,
      savedGrandTotal: totals.grandTotal,
      recalculatedGrandTotal: recalculatedGrandTotal,
      difference: (totals.grandTotal - recalculatedGrandTotal).toFixed(2)
    });

    const invoiceData = {
      company: invoice.company,
      invoice: invoice.invoice,
      billTo: invoice.billTo,
      shipTo: invoice.shipTo,
      items: invoice.items,
      charges: invoice.charges,
      tax: invoice.tax,
      subtotal: totals.subtotal,
      total: recalculatedGrandTotal, // ✅ Use recalculated total instead of saved value
      // ✅ Include discount calculation fields for correct invoice display
      discountAmount: totals.discountAmount,
      discountPercent: totals.discountPercent,
      discountedSubtotal: totals.discountedSubtotal,
      // ✅ Include taxable amount for clarity
      taxableValue: totals.taxableValue,
      totalTaxAmt: totals.totalTaxAmt,
      terms: invoice.terms,
      currencySymbol: invoice.currency === 'INR' ? '₹' : '$',
      currency: invoice.currency || 'INR',
      paymentmode: invoice.paymentmode || 'online',
      amountPaid: invoice.amountPaid || 0,
      additionalFilesMeta: invoice.additionalFilesMeta || [],
      paymentCurrency: order.paymentCurrency || 'INR',
      customerCountry: order.customerCountry || 'India',
      customerCity: order.customerCity || '',
      customerState: order.customerState || '',
      discount: order.discount || null,
    };

    console.log('📊 INVOICE DATA FOR PDF GENERATION - TAX INFO:', {
      orderId: order.orderId || order._id,
      taxType: invoice.tax?.type,
      cgstRate: invoice.tax?.cgstRate,
      sgstRate: invoice.tax?.sgstRate,
      igstRate: invoice.tax?.igstRate,
      cgstAmount: invoice.tax?.cgstAmount,
      sgstAmount: invoice.tax?.sgstAmount,
      igstAmount: invoice.tax?.igstAmount,
      totalTax: invoice.tax?.totalTax,
      billingState: invoice.billTo?.state,
      billingCountry: invoice.billTo?.country
    });

    let pdfPath = null;
    const invoiceUrl = null;

    try {
      pdfPath = await invoicePdfService.generatePDF(
        invoiceData,
        order.orderId || order._id
      );
    } catch (err) {
      console.warn('⚠️ PDF generation failed (non-blocking):', err.message || err);
    }

    const customerName =
      order.addresses?.billing?.fullName ||
      order.address?.fullName ||
      order.user?.name ||
      'Valued Customer';

    const customerEmail =
      order.customerPersonalInfo?.customerEmail ||
      order.addresses?.billing?.email ||
      order.address?.email ||
      order.email ||
      order.user?.email ||
      invoice?.order?.addresses?.billing?.email ||
      invoice?.order?.address?.email ||
      invoice?.order?.email;

    const customerPhone =
      order.addresses?.billing?.phone || // ✅ Priority: phone field (sent from frontend)
      order.addresses?.billing?.mobileNumber || // Fallback: mobileNumber field (legacy)
      order.address?.phone || // Legacy format: phone field
      order.address?.mobileNumber || // Legacy format: mobileNumber field
      order.user?.phone; // Final fallback: user phone

    // ✅ Treat empty strings as missing
    const validPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : null;
    
    if (validPhone) {
      const source = 
        order.addresses?.billing?.phone ? 'addresses.billing.phone' :
        order.addresses?.billing?.mobileNumber ? 'addresses.billing.mobileNumber' :
        order.address?.phone ? 'address.phone' :
        order.address?.mobileNumber ? 'address.mobileNumber' :
        'user.phone';
      console.log('✅ [ARTIFACTS] Phone extracted for WhatsApp:', {
        source,
        masked: validPhone.slice(-4).padStart(validPhone.length, '*'),
      });
    } else {
      console.warn('⚠️ [ARTIFACTS] Phone NOT found - WhatsApp will NOT send:', {
        hasBillingPhoneField: !!order.addresses?.billing?.phone && order.addresses.billing.phone.trim() !== '',
        hasBillingMobileField: !!order.addresses?.billing?.mobileNumber && order.addresses.billing.mobileNumber.trim() !== '',
        hasAddressPhoneField: !!order.address?.phone && order.address.phone.trim() !== '',
        hasAddressMobileField: !!order.address?.mobileNumber && order.address.mobileNumber.trim() !== '',
        hasUserPhone: !!order.user?.phone,
      });
    }

    // ✅ Return totals with recalculated grandTotal for email
    const correctedTotals = {
      ...totals,
      grandTotal: recalculatedGrandTotal
    };

    return {
      invoice,
      totals: correctedTotals, // ✅ Use corrected totals
      pdfPath,
      invoiceUrl,
      invoiceData,
      customerName,
      customerEmail,
      customerPhone: validPhone, // ✅ Return validated phone
    };
  } catch (error) {
    console.error('❌ Invoice generation failed (non-blocking):', error.message);
    return null;
  }
}

async function sendOrderEmail(order, artifacts) {
  try {
    if (!artifacts) {
      console.warn('⚠️ Missing invoice artifacts, skipping email notification');
      return { success: false, error: 'missing_invoice_artifacts' };
    }
    if (!artifacts?.customerEmail) {
      console.warn('⚠️ No customer email found, skipping email notification');
      return { success: false, error: 'missing_email' };
    }

    console.log('Sending order confirmation email...');
    console.log('Tax info in email invoice:', {
      taxType: artifacts.invoice?.tax?.type,
      cgstRate: artifacts.invoice?.tax?.cgstRate,
      sgstRate: artifacts.invoice?.tax?.sgstRate,
      igstRate: artifacts.invoice?.tax?.igstRate
    });
    
    let pdfPath = artifacts.pdfPath || null;
    if (pdfPath) {
      try {
        await fs.access(pdfPath);
      } catch (err) {
        console.warn('⚠️ PDF path missing on disk, will try regenerate:', pdfPath);
        pdfPath = null;
      }
    }

    if (!pdfPath && artifacts.invoiceData) {
      try {
        pdfPath = await invoicePdfService.generatePDF(
          artifacts.invoiceData,
          order.orderId || order._id
        );
      } catch (err) {
        console.warn('⚠️ PDF regeneration failed (non-blocking):', err.message || err);
      }
    }

    const result = await emailService.sendOrderConfirmation({
      customerEmail: artifacts.customerEmail,
      customerName: artifacts.customerName,
      orderId: order.orderId || order._id,
      totalAmount: order.displayPrice?.toFixed(2) || artifacts.totals?.grandTotal?.toFixed(2) || '0.00',
      currency: order.paymentCurrency || order.currency || artifacts.invoice?.currency || 'INR',
      paymentMode: artifacts.invoice?.paymentmode || 'Online',
      invoicePdfPath: pdfPath,
      items: artifacts.invoice?.items || [],
    });

    if (result.success) {
      console.log('✅ Email sent successfully');
    } else {
      console.warn('⚠️ Email failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Email failed (non-blocking):', error.message);
    return { success: false, error: error.message };
  }
}

// ✅ AiSensy Order Confirmation Helper
// NON-BLOCKING: Failures must NOT affect order success
async function sendAiSensyOrderMessage(order, artifacts) {
  try {
    console.log('📱 Starting AiSensy order confirmation...');

    if (!artifacts?.customerPhone) {
      console.warn('⚠️ [WHATSAPP] Skipping AiSensy - No customer phone found in artifacts');
      console.warn('   This usually means phone was not in the order (check ARTIFACTS debug logs above)');
      return { success: false, error: 'missing_phone' };
    }

    const maskedPhone = artifacts.customerPhone.slice(-4).padStart(artifacts.customerPhone.length, '*');
    console.log('✅ [WHATSAPP] Phone found, sending message to:', maskedPhone);
    
    console.log('📤 Sending AiSensy message...');
    const result = await aiSensyService.sendAiSensyOrderMessage({
      phoneNumber: artifacts.customerPhone,
      customerName: artifacts.customerName,
      orderId: order.orderId || order._id,
      finalAmount: artifacts.totals?.grandTotal?.toFixed(2) || '0.00',
      invoiceUrl: artifacts.invoiceUrl || null,
    });

    if (result.success) {
      console.log('✅ [WHATSAPP] AiSensy order confirmation sent successfully');
    } else {
      console.warn('⚠️ [WHATSAPP] AiSensy send failed:', result.error || result.message);
    }

    return result;
  } catch (error) {
    console.error('❌ AiSensy failed (non-blocking):', error.message);
    return { success: false, error: error.message };
  }
}


// ✅ Helper to build invoice payload with billing and shipping addresses
function buildInvoicePayload(order, orderData, addresses, legacyAddress, items, finalPfCharge, finalPrintingCharge, settings, orderType, paymentmode = 'online', totalAmount = 0) {
  console.log('📋 buildInvoicePayload called with:', {
    paymentmode,
    addresses: addresses ? { billing: addresses.billing?.fullName, shipping: addresses.shipping?.fullName } : null,
    legacyAddress: legacyAddress ? legacyAddress.fullName : null,
    orderDataUser: orderData?.user?.name
  });
  
  const billingAddr = addresses?.billing || legacyAddress;
  const shippingAddr = addresses?.shipping || legacyAddress;
  
  console.log('🔍 billingAddr selected:', {
    source: addresses?.billing ? 'addresses.billing' : 'legacyAddress',
    name: billingAddr?.fullName
  });
  
  // ✅ Calculate amount paid based on payment mode
  // For 50% payments, totalAmount is already the 50% amount (from frontend)
  // So we use it directly as amountPaid
  let amountPaid = totalAmount;
  if (paymentmode === '50%') {
    // totalAmount is already 50% from frontend, so use it directly
    amountPaid = totalAmount;
  }
  
  const payload = {
    company: settings?.company,
    invoice: {
      number: String(order._id),
      date: formatDateDDMMYYYY(),
      placeOfSupply: billingAddr?.state || settings?.invoice?.placeOfSupply,
      reverseCharge: !!settings?.invoice?.reverseCharge,
      copyType: settings?.invoice?.copyType || 'Original Copy',
    },
    billTo: {
      name: billingAddr?.fullName || orderData.user?.name || '',
      address: addressToLine(billingAddr),
      gstin: billingAddr?.gstin || '',
      state: billingAddr?.state || '',
      country: billingAddr?.country || 'India',
    },
    items: buildInvoiceItems(items),
    charges: {
      pf: finalPfCharge,
      printing: finalPrintingCharge,
    },
    terms: settings?.terms,
    forCompany: settings?.forCompany,
    order: order._id,
    orderType: orderType, // ✅ Pass order type to invoice
    paymentmode: paymentmode, // ✅ Add payment mode
    amountPaid: amountPaid, // ✅ Add amount paid (for 50% payments)
    total: totalAmount, // ✅ Add total amount to invoice
    discount: order.discount || null, // ✅ Add discount info if applied
  };
  
  // ✅ Add shipTo only if different from billing
  // Compare by address content, not object reference
  const isSameAddress = addresses?.sameAsBilling || 
    (billingAddr && shippingAddr && 
     billingAddr.fullName === shippingAddr.fullName &&
     billingAddr.houseNumber === shippingAddr.houseNumber &&
     billingAddr.street === shippingAddr.street &&
     billingAddr.city === shippingAddr.city &&
     billingAddr.state === shippingAddr.state &&
     billingAddr.pincode === shippingAddr.pincode);
  
  console.log('🏠 Address Comparison:', {
    sameAsBillingFlag: addresses?.sameAsBilling,
    billingName: billingAddr?.fullName,
    shippingName: shippingAddr?.fullName,
    isSameAddress,
    willAddShipTo: addresses?.shipping && !isSameAddress
  });
  
  if (addresses?.shipping && !isSameAddress) {
    payload.shipTo = {
      name: orderData.user?.name || '',
      address: addressToLine(shippingAddr),
      state: shippingAddr?.state || '',
      country: shippingAddr?.country || 'India',
    };
    console.log('✅ Added shipTo to invoice:', payload.shipTo);
  } else {
    console.log('⏭️ Skipping shipTo - addresses are the same');
  }
  
  return payload;
}

async function verifyRazorpayPayment(paymentId, expectedAmountINR, paymentCurrency = 'INR', foreignAmount = null) {
  if (!paymentId) throw new Error('Missing paymentId');
  const payment = await razorpay.payments.fetch(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'captured') {
    throw new Error(`Payment not captured (status: ${payment.status})`);
  }

  // ✅ FIX: For international payments, compare in foreign currency sub-units
  // DO NOT touch this block for INR — INR flow is unchanged below
  if (paymentCurrency !== 'INR' && foreignAmount != null) {
    // e.g. SGD 19.60 → 1960 SGD cents (Razorpay stores amount in smallest currency unit)
    const expectedForeignSubunits = Math.round(safeNum(foreignAmount, 0) * 100);
    if (safeNum(payment.amount, -1) !== expectedForeignSubunits) {
      throw new Error(
        `Payment amount mismatch. Expected ${paymentCurrency} ${foreignAmount}, got ${paymentCurrency} ${safeNum(payment.amount, 0) / 100}`
      );
    }
    return payment;
  }

  // ✅ INR flow — unchanged
  const expectedPaise = Math.round(safeNum(expectedAmountINR, 0) * 100);
  if (safeNum(payment.amount, -1) !== expectedPaise) {
    throw new Error(
      `Payment amount mismatch. Expected ₹${expectedAmountINR}, got ₹${safeNum(payment.amount, 0) / 100
      }`
    );
  }
  return payment;
}

// ================================================================
// COMPLETE ORDER
// ================================================================

// Simple in-memory cache to prevent duplicate processing
const processingCache = new Map();

const completeOrder = async (req, res) => {
  let { paymentId, orderData, paymentmode, compressed, paymentCurrency, customerCountry, customerCity, customerState } = req.body || {};

  // ✅ Extract discount from orderData (frontend sends it inside orderData)
  const discount = orderData?.discount || null;
  const finalDiscount = discount;

  // 🧾 Log payment mode received from frontend
  console.log('🧾 PAYMENT MODE RECEIVED:', paymentmode);
  if (discount) {
    console.log('💰 DISCOUNT RECEIVED:', discount);
  }

  // ✅ Prevent duplicate processing for the same payment ID
  if (paymentId && paymentId !== 'manual_payment') {
    const cacheKey = `${paymentId}_${paymentmode}`;

    if (processingCache.has(cacheKey)) {
      const cachedTime = processingCache.get(cacheKey);
      const timeDiff = Date.now() - cachedTime;

      if (timeDiff < 30000) { // 30 seconds
        console.log('⚠️ Duplicate request detected within 30 seconds, checking for existing order...');
        
        // Try to find existing order for this payment
        try {
          const existingOrder = await Order.findOne({ razorpayPaymentId: paymentId });
          if (existingOrder) {
            console.log('✅ Found existing order:', existingOrder._id);
            return res.status(200).json({
              success: true,
              order: existingOrder,
              message: 'Request already being processed',
              duplicate: true
            });
          }
        } catch (err) {
          console.error('Error finding existing order:', err);
        }
        
        // If no order found yet, return without order (still processing)
        console.log('⚠️ Order still being processed, no order found yet');
        return res.status(202).json({
          success: false,
          message: 'Request already being processed, please wait',
          duplicate: true,
          processing: true
        });
      }
    }

    // Mark as processing
    processingCache.set(cacheKey, Date.now());

    // Clean up old entries (older than 5 minutes)
    for (const [key, time] of processingCache.entries()) {
      if (Date.now() - time > 300000) {
        processingCache.delete(key);
      }
    }
  }

  // ✅ Log raw data from frontend
  console.log('🔍 RAW REQUEST DATA FROM FRONTEND:', {
    paymentId,
    paymentmode,
    compressed,
    orderData: orderData
      ? {
        items: orderData.items?.length || 0,
        totalPay: orderData.totalPay,
        address: orderData.address,
        addresses: orderData.addresses ? { billing: orderData.addresses.billing?.fullName, shipping: orderData.addresses.shipping?.fullName } : undefined,
        user: orderData.user,
        pf: orderData.pf,
        pfFlat: orderData.pfFlat,
        gst: orderData.gst,
        printing: orderData.printing,
        printingPerSide: orderData.printingPerSide,
        printingUnits: orderData.printingUnits,
      }
      : null,
  });

  // ✅ Normalize charge structure (accept both orderData.charges.* or flat fields)
  // Order model has pf and printing as direct fields, not nested in charges
  const pfCharge =
    safeNum(orderData?.pf, 0) || safeNum(orderData?.charges?.pf, 0) || 0;
  const printingCharge =
    safeNum(orderData?.printing, 0) ||
    safeNum(orderData?.charges?.printing, 0) ||
    0;
  
  console.log('💰 Charges extracted:', { pfCharge, printingCharge, orderDataPf: orderData?.pf, orderDataPrinting: orderData?.printing });

  try {
    // ✅ Check for duplicate orders based on payment ID
    if (paymentId && paymentId !== 'manual_payment') {
      const existingOrder = await Order.findOne({ razorpayPaymentId: paymentId });
      if (existingOrder) {
        console.log('⚠️ Duplicate order detected for payment ID:', paymentId);
        console.log('Existing order ID:', existingOrder._id);
        return res.status(200).json({
          success: true,
          order: existingOrder,
          message: 'Order already exists for this payment'
        });
      }
    }

    // ✅ Decompress if compressed
    if (compressed && typeof orderData === 'string') {
      try {
        const jsonString = LZString.decompressFromBase64(orderData);
        orderData = JSON.parse(jsonString);
        console.log('✅ Order data decompressed successfully');
      } catch (e) {
        console.error('❌ Decompression failed:', e.message);
        return res
          .status(400)
          .json({ success: false, message: 'Invalid compressed payload' });
      }
    }

    if (
      !orderData ||
      !orderData.items ||
      !orderData.user ||
      (!orderData.address && !orderData.addresses)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid order data' });
    }

    let order = null;
    let payment = null;

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const totalPay = safeNum(orderData.totalPay, 0);
    const rawTotalAmount = safeNum(
      orderData.originalTotal ||
      orderData.totals?.grandTotal ||
      totalPay
    );
    const totalAmount = paymentmode === '50%' && rawTotalAmount <= totalPay
      ? totalPay * 2
      : rawTotalAmount;
    
    // ✅ CRITICAL: Validate products array BEFORE creating order
    const productValidation = validateProductsArray(items);
    if (!productValidation.valid) {
      console.error('❌ Product validation failed:', productValidation.error);
      return res.status(400).json({ 
        success: false, 
        message: productValidation.error 
      });
    }
    
    // ✅ CRITICAL: Upload design images to Cloudinary FIRST, then clean items
    console.log('📸 Uploading design images to Cloudinary BEFORE creating order...');
    const designImages = await extractAndUploadDesignImages(items, `temp-${Date.now()}`);
    console.log('✅ Design images uploaded:', designImages);
    
    // ✅ Now clean items array - Remove ALL base64 data before saving to DB
    const cleanedItems = cleanItemsForDatabase(items);
    
    // ✅ Validate stock before creating order
    const outOfStockItems = await validateStock(cleanedItems);
    if (outOfStockItems.length > 0) {
      console.error('❌ Stock validation failed:', outOfStockItems);
      return res.status(400).json({
        success: false,
        message: 'Some items are out of stock or have insufficient stock',
        outOfStockItems
      });
    }
    
    // ✅ Handle both old single address and new billing/shipping addresses
    let addresses = null;
    let legacyAddress = null;
    
    console.log('📦 Received orderData.addresses:', JSON.stringify(orderData.addresses, null, 2));
    console.log('📦 Received orderData.address:', JSON.stringify(orderData.address, null, 2));
    
    if (orderData.addresses) {
      // New format: separate billing and shipping
      addresses = {
        billing: {
          ...orderData.addresses.billing,
          email: orderData.addresses.billing?.email || orderData.user?.email || 'not_provided@duco.com',
        },
        shipping: {
          ...orderData.addresses.shipping,
          email: orderData.addresses.shipping?.email || orderData.user?.email || 'not_provided@duco.com'
        },
        sameAsBilling: orderData.addresses.sameAsBilling === true // ✅ FIX: Only true if explicitly true
      };
      console.log('✅ Using new addresses format:', {
        billingName: addresses.billing.fullName,
        shippingName: addresses.shipping.fullName,
        sameAsBilling: addresses.sameAsBilling
      });
    } else if (orderData.address) {
      // Legacy format: single address (use for both billing and shipping)
      legacyAddress = {
        ...orderData.address,
        email: orderData.address?.email || orderData.user?.email || 'not_provided@duco.com',
      };
      console.log('⚠️ Using legacy address format:', legacyAddress.fullName);
    }

    const user =
      typeof orderData.user === 'object'
        ? orderData.user._id
        : orderData.user?.toString?.() || orderData.user;

    // ✅ Extract billing country from addresses
    const billingCountry = addresses?.billing?.country || legacyAddress?.country || 'India';
    const customerCountry = orderData.customerCountry || billingCountry;
    const customerCity = orderData.customerCity || addresses?.billing?.city || legacyAddress?.city || '';
    const customerState = orderData.customerState || addresses?.billing?.state || legacyAddress?.state || '';

    // ✅ Use currency from frontend (displayCurrency), fallback to detecting from country
    const detectedCurrency = getCurrencyFromCountry(billingCountry);
    const currency = orderData.displayCurrency || paymentCurrency || detectedCurrency;
    
    // ✅ Use payment currency from frontend if provided, otherwise use detected currency
    const finalPaymentCurrency = orderData.displayCurrency || paymentCurrency || currency;
    const finalCustomerCountry = customerCountry || billingCountry;
    const finalCustomerCity = customerCity || '';
    const finalCustomerState = customerState || '';
    
    console.log('💱 Payment Currency & Location:', {
      frontendCurrency: orderData.displayCurrency,
      paymentCurrency: paymentCurrency,
      detectedCurrency: detectedCurrency,
      finalCurrency: currency,
      customerCountry: finalCustomerCountry,
      customerCity: finalCustomerCity,
      customerState: finalCustomerState,
      billingCountry,
    });
    
    // ✅ Get conversion rate and display price from orderData (try multiple locations)
    const conversionRate = safeNum(
      orderData.conversionRate || 
      orderData.totals?.conversionRate || 
      1
    );
    
    const displayPrice = safeNum(
      orderData.totalPayDisplay || 
      orderData.totals?.grandTotal || 
      totalPay
    );
    
    console.log('💱 Currency & Price Details:', {
      billingCountry,
      detectedCurrency: currency,
      priceInINR: totalPay,
      displayPrice: displayPrice,
      conversionRate: conversionRate,
      source: {
        conversionRate: orderData.conversionRate ? 'root' : orderData.totals?.conversionRate ? 'totals' : 'default',
        displayPrice: orderData.totalPayDisplay ? 'root' : orderData.totals?.grandTotal ? 'totals' : 'default'
      }
    });

    // ✅ Detect if order is Corporate (B2B) or Retail (B2C)
    const isCorporateOrder = (orderData?.items || []).some(
      (item) => item?.isCorporate === true
    );
    const orderType = isCorporateOrder ? 'B2B' : 'B2C';

    console.log('🏢 Order Type Detection:', {
      isCorporateOrder,
      orderType,
      items: (orderData?.items || []).map(item => ({
        name: item?.name || item?.products_name,
        isCorporate: item?.isCorporate
      }))
    });

    // ✅ Calculate total quantity and check for designed items
    const totalQty = (orderData?.items || []).reduce((sum, item) => {
      const qty = Object.values(item.quantity || {}).reduce(
        (a, q) => a + safeNum(q), 0
      );
      return sum + qty;
    }, 0);
    
    // ✅ Check if ANY item has design (uploadedImage OR customText on any side)
    const hasDesignedItem = (orderData?.items || []).some((item) => {
      if (!item?.design) return false;
      const sides = ['front', 'back', 'left', 'right'];
      return sides.some(side => 
        item.design[side]?.uploadedImage || item.design[side]?.customText
      );
    });

    // ✅ ADMIN-DRIVEN PRINTING CHARGES (from Charge Plan Manager):
    // B2B: Always apply admin's printingCharge
    // B2C: Apply ONLY if BOTH: has design AND total qty >= 5
    let finalPrintingCharge = 0;
    if (isCorporateOrder) {
      // B2B: Always apply
      finalPrintingCharge = printingCharge;
    } else if (hasDesignedItem && totalQty >= 5) {
      // B2C: Apply only if designed AND qty >= 5
      finalPrintingCharge = printingCharge;
    }
    
    // ✅ P&F charges: Only for B2B orders
    let finalPfCharge = isCorporateOrder ? pfCharge : 0;
    
    console.log('📦 Charges Logic:', { 
      orderType,
      totalQty,
      hasDesignedItem,
      printingCharge,
      finalPrintingCharge,
      pfCharge: finalPfCharge,
      reason: isCorporateOrder 
        ? 'B2B order - all charges applied' 
        : (hasDesignedItem && totalQty >= 5)
          ? `B2C designed + qty(${totalQty}) >= 5 - printing applied`
          : `B2C without design or qty(${totalQty}) < 5 - no printing`
    });

    // ================================================================
    // CASE 0 – NORMALIZE PAYMENT MODE DISPLAY
    // ================================================================
    // ✅ Keep paymentmode as enum value, create readableMode for display only
    // ================================================================
    let readableMode = paymentmode;
    if (paymentmode === 'store_pickup' || paymentmode === 'pickup') readableMode = 'Pay on Store';
    else if (paymentmode === 'netbanking') readableMode = 'Paid via Netbanking';
    else if (paymentmode === '50%') readableMode = '50% Advance Payment';
    else if (paymentmode === 'online') readableMode = 'Online Payment';
    else if (paymentmode === 'manual_payment') readableMode = 'Manual Payment';

    // ================================================================
    // VALIDATION: Store Pickup is ONLY for B2B Orders
    // ================================================================
    if ((paymentmode === 'store_pickup' || paymentmode === 'pickup') && !isCorporateOrder) {
      console.error('❌ Store Pickup payment method is only available for B2B orders');
      return res.status(403).json({
        success: false,
        message: 'Store Pickup payment method is only available for B2B (Corporate) orders'
      });
    }

    // ================================================================
    // VALIDATION: Bulk Order Minimum Quantity (Total Cart)
    // ================================================================
    if (isCorporateOrder && items && items.length > 0) {
      try {
        // Get minimum order quantity from settings
        const settings = await CorporateSettings.findOne();
        const minOrderQty = settings?.minOrderQuantity || 100;
        
        // Calculate total quantity across all bulk/corporate items
        const totalBulkQty = items.reduce((total, item) => {
          const itemQty = Object.values(item.quantity || {}).reduce((sum, q) => sum + safeNum(q), 0);
          return total + itemQty;
        }, 0);
        
        console.log('📦 Backend Bulk Order Validation:', {
          isCorporateOrder,
          itemsCount: items.length,
          totalBulkQty,
          minOrderQty,
          meetsMinimum: totalBulkQty >= minOrderQty
        });
        
        // Block order if total quantity doesn't meet minimum
        if (totalBulkQty < minOrderQty) {
          console.error(`❌ Bulk order minimum not met: ${totalBulkQty}/${minOrderQty} units`);
          return res.status(400).json({
            success: false,
            message: `Bulk order minimum not met. Minimum ${minOrderQty} total units required. You have ${totalBulkQty} units.`,
            error: 'BULK_MINIMUM_NOT_MET',
            data: {
              totalQuantity: totalBulkQty,
              minimumRequired: minOrderQty,
              shortfall: minOrderQty - totalBulkQty
            }
          });
        }
        
        console.log('✅ Bulk order minimum validation passed');
      } catch (validationError) {
        console.error('❌ Error validating bulk order minimum:', validationError);
        // Continue with order creation even if validation check fails
        // (frontend validation should have caught this already)
      }
    }

    // ================================================================
    // CASE 1 – STORE PICKUP (NEW)
    // ================================================================
    if (paymentmode === 'store_pickup' || paymentmode === 'pickup') {
      try {
        // ✅ Get estimated delivery date from settings
        const deliveryExpectedDate = await getEstimatedDeliveryDate();
        // ✅ Extract ALL breakdown values from cart (CART CALCULATED THESE - NEVER RECALCULATE)
        const cartTotals = orderData.totals || {};
        const displaySubtotal = safeNum(cartTotals.itemsSubtotal || cartTotals.subtotal || 0);
        const displayDiscountAmount = safeNum(cartTotals.discountAmount || orderData.discount?.amount || 0);
        const displayPfCost = safeNum(cartTotals.pfCost || orderData.pf || finalPfCharge);
        const displayPrintingCost = safeNum(cartTotals.printingCost || orderData.printing || finalPrintingCharge);
        const displayTaxAmount = safeNum(cartTotals.gstTotal || orderData.gst || 0);
        const displayGrandTotal = safeNum(displayPrice);
        
        // ✅ Calculate base (INR) values for these breakdowns
        const baseSubtotal = conversionRate && conversionRate !== 1 
          ? safeNum(displaySubtotal / conversionRate)
          : displaySubtotal;
        const baseDiscountAmount = conversionRate && conversionRate !== 1
          ? safeNum(displayDiscountAmount / conversionRate)
          : displayDiscountAmount;
        const basePfCost = conversionRate && conversionRate !== 1
          ? safeNum(displayPfCost / conversionRate)
          : displayPfCost;
        const basePrintingCost = conversionRate && conversionRate !== 1
          ? safeNum(displayPrintingCost / conversionRate)
          : displayPrintingCost;
        const baseTaxAmount = conversionRate && conversionRate !== 1
          ? safeNum(displayTaxAmount / conversionRate)
          : displayTaxAmount;
        const baseGrandTotal = safeNum(totalPay);
        
        console.log('💰 Storing Complete Breakdown (Display & Base):', {
          display: {
            currency: currency,
            subtotal: displaySubtotal,
            discount: displayDiscountAmount,
            pf: displayPfCost,
            printing: displayPrintingCost,
            tax: displayTaxAmount,
            grandTotal: displayGrandTotal
          },
          base: {
            currency: 'INR',
            subtotal: baseSubtotal,
            discount: baseDiscountAmount,
            pf: basePfCost,
            printing: basePrintingCost,
            tax: baseTaxAmount,
            grandTotal: baseGrandTotal
          }
        });
        
        // ✅ Calculate tax type for proper display
        const { calculateTax } = require('../Service/TaxCalculationService');
        const taxableForType = (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost;
        const taxInfo = calculateTax(taxableForType, finalCustomerState, finalCustomerCountry, orderType === 'B2B');
        
        console.log('💰 STORE_PICKUP - Tax Info:', {
          taxType: taxInfo.type,
          cgst: taxInfo.cgstAmount,
          sgst: taxInfo.sgstAmount,
          igst: taxInfo.igstAmount,
          taxAmount: taxInfo.taxAmount,
          totalTax: taxInfo.totalTax
        });
        
        const orderPayload = {
          products: cleanedItems,
          price: totalPay, // INR price (for Razorpay)
          totalPay: totalPay,
          user,
          status: 'Pending',
          paymentStatus: 'Pending', // ✅ Manual payment methods start as Pending
          totalAmount: totalAmount,
          advancePaidAmount: 0,
          remainingAmount: totalAmount,
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: finalPfCharge,
          gst: safeNum(orderData.gst, 0),
          cgst: taxInfo.cgstAmount || 0,
          sgst: taxInfo.sgstAmount || 0,
          igst: taxInfo.igstAmount || 0,
          taxType: taxInfo.type || null,
          printing: finalPrintingCharge,
          orderType,
          currency, // ✅ Customer's currency
          displayPrice, // ✅ Price in customer's currency
          conversionRate, // ✅ Conversion rate used
          deliveryExpectedDate, // ✅ Use setting-based delivery date
          // ✅ Add payment currency and location
          paymentCurrency: finalPaymentCurrency,
          customerCountry: finalCustomerCountry,
          customerCity: finalCustomerCity,
          customerState: finalCustomerState,
          // ✅ Add discount if applied
          discount: discount || null,
          // ✅ Add pickup details from orderData
          pickupDetails: orderData?.pickupDetails || null,
          // ✅ CRITICAL: Store COMPLETE breakdown (CART CALCULATED - NEVER RECALCULATE)
          // Display values (what customer sees)
          displaySubtotal: displaySubtotal,
          displayDiscount: displayDiscountAmount,
          displayPf: displayPfCost,
          displayPrinting: displayPrintingCost,
          displayTax: displayTaxAmount,
          displayGrandTotal: displayGrandTotal,
          displayCurrency: currency,
          // Base values (INR for records)
          baseSubtotal: baseSubtotal,
          baseDiscount: baseDiscountAmount,
          basePf: basePfCost,
          basePrinting: basePrintingCost,
          baseTax: baseTaxAmount,
          baseGrandTotal: baseGrandTotal,
          baseCurrency: 'INR',
          // Calculated values (for backward compatibility)
          subtotal: displaySubtotal,
          subtotalAfterDiscount: displaySubtotal - displayDiscountAmount,
          taxableAmount: (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost,
        };
        
        // ✅ Add addresses (new format) or address (legacy format)
        if (addresses) {
          orderPayload.addresses = addresses;
        } else if (legacyAddress) {
          orderPayload.address = legacyAddress;
        }
        
        order = await Order.create(orderPayload);
        
        // ✅ [DB CHECK] Verify pickup details persisted
        console.log('✅ STORE_PICKUP order created with details:', {
          orderId: order.orderId || order._id,
          paymentmode: order.paymentmode,
          pickupDetails: order.pickupDetails,
          pickupName: order.pickupDetails?.name,
          pickupPhone: order.pickupDetails?.phone,
          pickupAt: order.pickupDetails?.pickupAt,
          pickupNotes: order.pickupDetails?.notes,
        });
        
        // ✅ [DB CHECK] Verify phone persisted
        console.log('[DB CHECK - STORE_PICKUP] Saved addresses after Order.create():', {
          orderId: order.orderId || order._id,
          billingPhone: order.addresses?.billing?.phone || 'MISSING',
          billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
          shippingPhone: order.addresses?.shipping?.phone || 'MISSING',
          shippingMobileNumber: order.addresses?.shipping?.mobileNumber || 'MISSING',
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          const deliveryExpectedDate = await getEstimatedDeliveryDate();
          
          // ✅ Calculate complete breakdown for storage (NO RECALCULATION LATER)
          const itemsSubtotal = items.reduce((sum, item) => {
            const qty = Object.values(item.quantity || {}).reduce((a, b) => a + safeNum(b), 0);
            return sum + (qty * safeNum(item.price));
          }, 0);
          const discountAmount = discount?.amount || 0;
          const subtotalAfterDiscount = itemsSubtotal - discountAmount;
          const taxableAmount = subtotalAfterDiscount + finalPfCharge + finalPrintingCharge;
          
          // ✅ Calculate tax type for proper display
          const { calculateTax } = require('../Service/TaxCalculationService');
          const taxInfo = calculateTax(taxableAmount, finalCustomerState, finalCustomerCountry, orderType === 'B2B');
          
          order = await Order.create({
            products: cleanedItems,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            status: 'Pending',
            paymentStatus: 'Pending', // ✅ Manual payment methods start as Pending
            totalAmount: totalAmount,
            advancePaidAmount: 0,
            remainingAmount: totalAmount,
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: finalPfCharge,
            gst: safeNum(orderData.gst, 0),
            cgst: taxInfo.cgstAmount || 0,
            sgst: taxInfo.sgstAmount || 0,
            igst: taxInfo.igstAmount || 0,
            taxType: taxInfo.type || null,
            printing: finalPrintingCharge,
            orderType,
            currency, // ✅ Customer's currency
            displayPrice, // ✅ Price in customer's currency
            conversionRate, // ✅ Conversion rate used
            deliveryExpectedDate, // ✅ Use setting-based delivery date
            // ✅ Add payment currency and location
            paymentCurrency: finalPaymentCurrency,
            customerCountry: finalCustomerCountry,
            customerCity: finalCustomerCity,
            customerState: finalCustomerState,
            // ✅ Add discount if applied
            discount: discount || null,
            // ✅ Add pickup details from orderData
            pickupDetails: orderData?.pickupDetails || null,
            // ✅ CRITICAL: Store complete breakdown (CART CALCULATES ONCE, BACKEND STORES, PAGES DISPLAY)
            subtotal: itemsSubtotal,
            subtotalAfterDiscount: subtotalAfterDiscount,
            taxableAmount: taxableAmount,
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
          
          // ✅ [DB CHECK] Verify phone persisted in retry
          console.log('[DB CHECK - STORE_PICKUP RETRY] Saved addresses after Order.create():', {
            orderId: order.orderId || order._id,
            billingPhone: order.addresses?.billing?.phone || 'MISSING',
            billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
            shippingPhone: order.addresses?.shipping?.phone || 'MISSING',
            shippingMobileNumber: order.addresses?.shipping?.mobileNumber || 'MISSING',
          });
        } else {
          throw createError;
        }
      }

      const settings = await getOrCreateSingleton();
      console.log('🏪 STORE PICKUP: About to build invoice payload with:', {
        hasAddresses: !!addresses,
        addressesBilling: addresses?.billing?.fullName,
        hasLegacyAddress: !!legacyAddress,
        legacyAddressName: legacyAddress?.fullName,
        paymentmode
      });
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, finalPfCharge, finalPrintingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (store pickup):', e);
      }

      // ✅ Reduce stock after order creation
      try {
        await reduceProductStock(items);
      } catch (e) {
        console.error('Stock reduction failed (store pickup):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      // ✅ Save Cloudinary URLs to order (already uploaded above)
      if (Object.keys(designImages).length > 0) {
        order.designImages = designImages;
        await order.save();
        console.log('✅ Design images saved to order (store pickup)');
      }

      // ✅ Build invoice artifacts and send email IMMEDIATELY (non-blocking)
      const artifacts = await buildInvoiceArtifacts(order, req);
      
      // ✅ Send email immediately without blocking the response
      let emailQueued = false;
      if (artifacts?.customerEmail) {
        setImmediate(async () => {
          try {
            console.log('📧 Sending order confirmation email (store pickup)...');
            const emailResult = await sendOrderEmail(order, artifacts);
            if (emailResult.success) {
              console.log('✅ Email sent successfully');
            } else {
              console.warn('⚠️ Email sending failed:', emailResult.error);
            }
          } catch (err) {
            console.error('❌ Email sending error:', err.message);
          }
        });
        emailQueued = true;
        console.log('✅ Email queued for immediate delivery');
      }
      
      const whatsappResult = await sendAiSensyOrderMessage(order, artifacts);
      const notifications = {
        emailSent: emailQueued,
        emailError: emailQueued ? null : 'no_email_found',
        emailStatus: emailQueued ? 'sent' : 'failed',
        whatsappSent: !!whatsappResult.success,
        whatsappError: whatsappResult.success ? null : (whatsappResult.error || whatsappResult.message),
      };

      console.log('📤 RESPONSE TO FRONTEND [STORE PICKUP]:', {
        orderId: order.orderId,
        invoiceUrl: order.invoiceUrl,
        emailSent: notifications.emailSent,
        whatsappSent: notifications.whatsappSent
      });

      return res.status(200).json({ success: true, order, notifications });
    }

    // ================================================================
    // CASE 2 – NETBANKING
    // ================================================================
    if (paymentmode === 'netbanking') {
      // ✅ Get estimated delivery date from settings
      const deliveryExpectedDate = await getEstimatedDeliveryDate();
      
      // ✅ Extract ALL breakdown values from cart (CART CALCULATED THESE - NEVER RECALCULATE)
      const cartTotals = orderData.totals || {};
      const displaySubtotal = safeNum(cartTotals.itemsSubtotal || cartTotals.subtotal || 0);
      const displayDiscountAmount = safeNum(cartTotals.discountAmount || orderData.discount?.amount || 0);
      const displayPfCost = safeNum(cartTotals.pfCost || orderData.pf || finalPfCharge);
      const displayPrintingCost = safeNum(cartTotals.printingCost || orderData.printing || finalPrintingCharge);
      const displayTaxAmount = safeNum(cartTotals.gstTotal || orderData.gst || 0);
      const displayGrandTotal = safeNum(displayPrice);
      
      // ✅ Calculate base (INR) values for these breakdowns
      const baseSubtotal = conversionRate && conversionRate !== 1 
        ? safeNum(displaySubtotal / conversionRate)
        : displaySubtotal;
      const baseDiscountAmount = conversionRate && conversionRate !== 1
        ? safeNum(displayDiscountAmount / conversionRate)
        : displayDiscountAmount;
      const basePfCost = conversionRate && conversionRate !== 1
        ? safeNum(displayPfCost / conversionRate)
        : displayPfCost;
      const basePrintingCost = conversionRate && conversionRate !== 1
        ? safeNum(displayPrintingCost / conversionRate)
        : displayPrintingCost;
      const baseTaxAmount = conversionRate && conversionRate !== 1
        ? safeNum(displayTaxAmount / conversionRate)
        : displayTaxAmount;
      const baseGrandTotal = safeNum(totalPay);
      
      console.log('💰 NETBANKING - Storing Complete Breakdown:', {
        display: { currency, subtotal: displaySubtotal, discount: displayDiscountAmount, pf: displayPfCost, printing: displayPrintingCost, tax: displayTaxAmount, grandTotal: displayGrandTotal },
        base: { currency: 'INR', subtotal: baseSubtotal, discount: baseDiscountAmount, pf: basePfCost, printing: basePrintingCost, tax: baseTaxAmount, grandTotal: baseGrandTotal }
      });
      
      // ✅ Calculate tax type for proper display
      const { calculateTax } = require('../Service/TaxCalculationService');
      const taxableForType = (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost;
      const taxInfo = calculateTax(taxableForType, finalCustomerState, finalCustomerCountry, orderType === 'B2B');
      
      console.log('💰 NETBANKING - Tax Info:', {
        taxType: taxInfo.type,
        cgst: taxInfo.cgstAmount,
        sgst: taxInfo.sgstAmount,
        igst: taxInfo.igstAmount,
        taxAmount: taxInfo.taxAmount,
        totalTax: taxInfo.totalTax
      });
      
      order = await Order.create({
        products: cleanedItems,
        price: totalPay,
        totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
        ...(addresses ? { addresses } : { address: legacyAddress }),
        user,
        razorpayPaymentId: paymentId || null,
        status: 'Pending',
        paymentStatus: 'Paid', // ✅ Netbanking treated as paid on order creation
        totalAmount: totalAmount,
        advancePaidAmount: totalAmount,
        remainingAmount: 0,
        paymentmode: paymentmode, // ✅ Use enum value, not readableMode
        pf: finalPfCharge,
        printing: finalPrintingCharge,
        gst: safeNum(orderData.gst, 0),
        cgst: taxInfo.cgstAmount || 0,
        sgst: taxInfo.sgstAmount || 0,
        igst: taxInfo.igstAmount || 0,
        taxType: taxInfo.type || null,
        orderType,
        currency, // ✅ Customer's currency
        displayPrice, // ✅ Price in customer's currency
        deliveryExpectedDate, // ✅ Use setting-based delivery date
        conversionRate, // ✅ Conversion rate used
        // ✅ Add payment currency and location
        paymentCurrency: finalPaymentCurrency,
        customerCountry: finalCustomerCountry,
        customerCity: finalCustomerCity,
        customerState: finalCustomerState,
        // ✅ Add discount if applied
        discount: discount || null,
        // ✅ CRITICAL: Store COMPLETE breakdown (CART CALCULATED - NEVER RECALCULATE)
        subtotal: displaySubtotal,
        subtotalAfterDiscount: displaySubtotal - displayDiscountAmount,
        taxableAmount: (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost,
      });
      
      // ✅ [DB CHECK] Verify phone persisted
      console.log('[DB CHECK - NETBANKING] Saved addresses after Order.create():', {
        orderId: order.orderId || order._id,
        billingPhone: order.addresses?.billing?.phone || 'MISSING',
        billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
        shippingPhone: order.addresses?.shipping?.phone || 'MISSING',
        shippingMobileNumber: order.addresses?.shipping?.mobileNumber || 'MISSING',
      });

      const settings = await getOrCreateSingleton();
      console.log('🏦 NETBANKING: About to build invoice payload with:', {
        hasAddresses: !!addresses,
        addressesBilling: addresses?.billing?.fullName,
        hasLegacyAddress: !!legacyAddress,
        legacyAddressName: legacyAddress?.fullName,
        paymentmode
      });
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, finalPfCharge, finalPrintingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (netbanking):', e);
      }

      // ✅ Reduce stock after order creation
      try {
        await reduceProductStock(items);
      } catch (e) {
        console.error('Stock reduction failed (netbanking):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      // ✅ Save Cloudinary URLs to order (already uploaded above)
      if (Object.keys(designImages).length > 0) {
        order.designImages = designImages;
        await order.save();
        console.log('✅ Design images saved to order (netbanking)');
      }

      // ✅ Build invoice artifacts and send email IMMEDIATELY (non-blocking)
      const artifacts = await buildInvoiceArtifacts(order, req);
      
      // ✅ Send email immediately without blocking the response
      let emailQueued = false;
      if (artifacts?.customerEmail) {
        setImmediate(async () => {
          try {
            console.log('📧 Sending order confirmation email (netbanking)...');
            const emailResult = await sendOrderEmail(order, artifacts);
            if (emailResult.success) {
              console.log('✅ Email sent successfully');
            } else {
              console.warn('⚠️ Email sending failed:', emailResult.error);
            }
          } catch (err) {
            console.error('❌ Email sending error:', err.message);
          }
        });
        emailQueued = true;
        console.log('✅ Email queued for immediate delivery');
      }
      
      const whatsappResult = await sendAiSensyOrderMessage(order, artifacts);
      const notifications = {
        emailSent: emailQueued,
        emailError: emailQueued ? null : 'no_email_found',
        emailStatus: emailQueued ? 'sent' : 'failed',
        whatsappSent: !!whatsappResult.success,
        whatsappError: whatsappResult.success ? null : (whatsappResult.error || whatsappResult.message),
      };

      return res.status(200).json({ success: true, order, notifications });
    }

    // ================================================================
    // CASE 3 - ONLINE (FULL)
    // ================================================================
    if (paymentmode === 'online') {
      console.warn('⚠️ Skipping Razorpay verification for testing mode');
      payment = { id: paymentId || 'test_payment_id_001' };

      try {
        // ✅ Get estimated delivery date from settings
        const deliveryExpectedDate = await getEstimatedDeliveryDate();
        
        // ✅ Extract ALL breakdown values from cart (CART CALCULATED THESE - NEVER RECALCULATE)
        const cartTotals = orderData.totals || {};
        const displaySubtotal = safeNum(cartTotals.itemsSubtotal || cartTotals.subtotal || 0);
        const displayDiscountAmount = safeNum(cartTotals.discountAmount || orderData.discount?.amount || 0);
        const displayPfCost = safeNum(cartTotals.pfCost || orderData.pf || finalPfCharge);
        const displayPrintingCost = safeNum(cartTotals.printingCost || orderData.printing || finalPrintingCharge);
        const displayTaxAmount = safeNum(cartTotals.gstTotal || orderData.gst || 0);
        const displayGrandTotal = safeNum(displayPrice);
        
        // ✅ Calculate base (INR) values for these breakdowns
        const baseSubtotal = conversionRate && conversionRate !== 1 
          ? safeNum(displaySubtotal / conversionRate)
          : displaySubtotal;
        const baseDiscountAmount = conversionRate && conversionRate !== 1
          ? safeNum(displayDiscountAmount / conversionRate)
          : displayDiscountAmount;
        const basePfCost = conversionRate && conversionRate !== 1
          ? safeNum(displayPfCost / conversionRate)
          : displayPfCost;
        const basePrintingCost = conversionRate && conversionRate !== 1
          ? safeNum(displayPrintingCost / conversionRate)
          : displayPrintingCost;
        const baseTaxAmount = conversionRate && conversionRate !== 1
          ? safeNum(displayTaxAmount / conversionRate)
          : displayTaxAmount;
        const baseGrandTotal = safeNum(totalPay);
        
        console.log('💰 ONLINE - Storing Complete Breakdown:', {
          display: { currency, subtotal: displaySubtotal, discount: displayDiscountAmount, pf: displayPfCost, printing: displayPrintingCost, tax: displayTaxAmount, grandTotal: displayGrandTotal },
          base: { currency: 'INR', subtotal: baseSubtotal, discount: baseDiscountAmount, pf: basePfCost, printing: basePrintingCost, tax: baseTaxAmount, grandTotal: baseGrandTotal }
        });
        
        // ✅ Calculate tax type for proper display
        const { calculateTax } = require('../Service/TaxCalculationService');
        const taxableForType = (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost;
        const taxInfo = calculateTax(taxableForType, finalCustomerState, finalCustomerCountry, orderType === 'B2B');
        
        console.log('💰 ONLINE - Tax Info:', {
          taxType: taxInfo.type,
          cgst: taxInfo.cgstAmount,
          sgst: taxInfo.sgstAmount,
          igst: taxInfo.igstAmount,
          taxAmount: taxInfo.taxAmount,
          totalTax: taxInfo.totalTax
        });
        
        order = await Order.create({
          products: cleanedItems,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          ...(addresses ? { addresses } : { address: legacyAddress }),
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentStatus: 'Paid', // ✅ Online payments are immediately Paid
          totalAmount: totalAmount,
          advancePaidAmount: totalAmount,
          remainingAmount: 0,
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: finalPfCharge,
          printing: finalPrintingCharge,
          gst: safeNum(orderData.gst, 0),
          cgst: taxInfo.cgstAmount || 0,
          sgst: taxInfo.sgstAmount || 0,
          igst: taxInfo.igstAmount || 0,
          taxType: taxInfo.type || null,
          orderType,
          currency, // ✅ Customer's currency
          displayPrice, // ✅ Price in customer's currency
          conversionRate, // ✅ Conversion rate used
          deliveryExpectedDate, // ✅ Use setting-based delivery date
          // ✅ Add payment currency and location
          paymentCurrency: finalPaymentCurrency,
          customerCountry: finalCustomerCountry,
          customerCity: finalCustomerCity,
          customerState: finalCustomerState,
          // ✅ Add discount if applied
          discount: finalDiscount || null,
          // ✅ CRITICAL: Store COMPLETE breakdown (CART CALCULATED - NEVER RECALCULATE)
          subtotal: displaySubtotal,
          subtotalAfterDiscount: displaySubtotal - displayDiscountAmount,
          taxableAmount: (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost,
        });
        
        // ✅ [DB CHECK] Verify phone persisted
        console.log('[DB CHECK - ONLINE] Saved addresses after Order.create():', {
          orderId: order.orderId || order._id,
          billingPhone: order.addresses?.billing?.phone || 'MISSING',
          billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
          shippingPhone: order.addresses?.shipping?.phone || 'MISSING',
          shippingMobileNumber: order.addresses?.shipping?.mobileNumber || 'MISSING',
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          const deliveryExpectedDate = await getEstimatedDeliveryDate();
          
          // ✅ Calculate complete breakdown for storage (NO RECALCULATION LATER)
          const itemsSubtotal = items.reduce((sum, item) => {
            const qty = Object.values(item.quantity || {}).reduce((a, b) => a + safeNum(b), 0);
            return sum + (qty * safeNum(item.price));
          }, 0);
          const discountAmount = finalDiscount?.amount || 0;
          const subtotalAfterDiscount = itemsSubtotal - discountAmount;
          const taxableAmount = subtotalAfterDiscount + finalPfCharge + finalPrintingCharge;
          
          order = await Order.create({
            products: cleanedItems,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
            paymentStatus: 'Paid',
            totalAmount: totalAmount,
            advancePaidAmount: totalAmount,
            remainingAmount: 0,
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: finalPfCharge,
            printing: finalPrintingCharge,
            gst: safeNum(orderData.gst, 0),
            orderType,
            currency, // ✅ Customer's currency
            displayPrice, // ✅ Price in customer's currency
            conversionRate, // ✅ Conversion rate used
            deliveryExpectedDate, // ✅ Use setting-based delivery date
            // ✅ Add payment currency and location
            paymentCurrency: finalPaymentCurrency,
            customerCountry: finalCustomerCountry,
            customerCity: finalCustomerCity,
            customerState: finalCustomerState,
            // ✅ Add discount if applied
            discount: finalDiscount || null,
            // ✅ CRITICAL: Store complete breakdown (CART CALCULATES ONCE, BACKEND STORES, PAGES DISPLAY)
            subtotal: itemsSubtotal,
            subtotalAfterDiscount: subtotalAfterDiscount,
            taxableAmount: taxableAmount,
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
        } else {
          throw createError;
        }
      }

      // ✅ Handle Printrove routing based on order type
      const settings = await getOrCreateSingleton();
      
      // ✅ [DB CHECK] Verify phone persisted in online payment retry
      if (!order.addresses?.billing?.phone && !order.addresses?.billing?.mobileNumber) {
        console.warn('[DB CHECK - ONLINE FINAL] No phone found after Order.create():', {
          orderId: order.orderId || order._id,
          billingPhone: order.addresses?.billing?.phone || 'MISSING',
          billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
        });
      } else {
        console.log('[DB CHECK - ONLINE FINAL] Phone verified:', {
          orderId: order.orderId || order._id,
          billingPhone: order.addresses?.billing?.phone || order.addresses?.billing?.mobileNumber,
        });
      }
      
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, finalPfCharge, finalPrintingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (razorpay):', e);
      }

      // ✅ Reduce stock after order creation
      try {
        await reduceProductStock(items);
      } catch (e) {
        console.error('Stock reduction failed (razorpay):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      // ✅ Save Cloudinary URLs to order (already uploaded above)
      if (Object.keys(designImages).length > 0) {
        order.designImages = designImages;
        await order.save();
        console.log('✅ Design images saved to order (online)');
      }

      // ✅ Build invoice artifacts and send email IMMEDIATELY (non-blocking)
      const artifacts = await buildInvoiceArtifacts(order, req);
      
      // ✅ Send email immediately without blocking the response
      let emailQueued = false;
      if (artifacts?.customerEmail) {
        setImmediate(async () => {
          try {
            console.log('📧 Sending order confirmation email (online payment)...');
            const emailResult = await sendOrderEmail(order, artifacts);
            if (emailResult.success) {
              console.log('✅ Email sent successfully');
            } else {
              console.warn('⚠️ Email sending failed:', emailResult.error);
            }
          } catch (err) {
            console.error('❌ Email sending error:', err.message);
          }
        });
        emailQueued = true;
        console.log('✅ Email queued for immediate delivery');
      }
      
      const whatsappResult = await sendAiSensyOrderMessage(order, artifacts);
      const notifications = {
        emailSent: emailQueued,
        emailError: emailQueued ? null : 'no_email_found',
        emailStatus: emailQueued ? 'sent' : 'failed',
        whatsappSent: !!whatsappResult.success,
        whatsappError: whatsappResult.success ? null : (whatsappResult.error || whatsappResult.message),
      };

      return res.status(200).json({ success: true, order, notifications });
    }

    // ================================================================
    // CASE 4 – 50% PAY
    // ================================================================
    if (paymentmode === '50%') {
      console.warn('⚠️ Skipping Razorpay verification for 50% testing mode');
      payment = { id: paymentId || 'test_payment_id_50percent' };

      try {
        // ✅ Get estimated delivery date from settings
        const deliveryExpectedDate = await getEstimatedDeliveryDate();
        
        // ✅ Extract ALL breakdown values from cart (CART CALCULATED THESE - NEVER RECALCULATE)
        const cartTotals = orderData.totals || {};
        const displaySubtotal = safeNum(cartTotals.itemsSubtotal || cartTotals.subtotal || 0);
        const displayDiscountAmount = safeNum(cartTotals.discountAmount || orderData.discount?.amount || 0);
        const displayPfCost = safeNum(cartTotals.pfCost || orderData.pf || finalPfCharge);
        const displayPrintingCost = safeNum(cartTotals.printingCost || orderData.printing || finalPrintingCharge);
        const displayTaxAmount = safeNum(cartTotals.gstTotal || orderData.gst || 0);
        const displayGrandTotal = safeNum(displayPrice);
        
        // ✅ Calculate base (INR) values for these breakdowns
        const baseSubtotal = conversionRate && conversionRate !== 1 
          ? safeNum(displaySubtotal / conversionRate)
          : displaySubtotal;
        const baseDiscountAmount = conversionRate && conversionRate !== 1
          ? safeNum(displayDiscountAmount / conversionRate)
          : displayDiscountAmount;
        const basePfCost = conversionRate && conversionRate !== 1
          ? safeNum(displayPfCost / conversionRate)
          : displayPfCost;
        const basePrintingCost = conversionRate && conversionRate !== 1
          ? safeNum(displayPrintingCost / conversionRate)
          : displayPrintingCost;
        const baseTaxAmount = conversionRate && conversionRate !== 1
          ? safeNum(displayTaxAmount / conversionRate)
          : displayTaxAmount;
        const baseGrandTotal = safeNum(totalPay);
        
        console.log('💰 50% - Storing Complete Breakdown:', {
          display: { currency, subtotal: displaySubtotal, discount: displayDiscountAmount, pf: displayPfCost, printing: displayPrintingCost, tax: displayTaxAmount, grandTotal: displayGrandTotal },
          base: { currency: 'INR', subtotal: baseSubtotal, discount: baseDiscountAmount, pf: basePfCost, printing: basePrintingCost, tax: baseTaxAmount, grandTotal: baseGrandTotal }
        });
        
        order = await Order.create({
          products: cleanedItems,
          price: totalPay,
          totalPay: totalAmount, // ✅ Store FULL order amount, not advance
          ...(addresses ? { addresses } : { address: legacyAddress }),
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentStatus: 'partial',
          totalAmount: totalAmount,
          advancePaidAmount: totalPay,
          remainingAmount: Math.max(totalAmount - totalPay, 0),
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: finalPfCharge,
          printing: finalPrintingCharge,
          gst: safeNum(orderData.gst, 0),
          orderType,
          currency, // ✅ Customer's currency
          displayPrice, // ✅ Price in customer's currency
          conversionRate, // ✅ Conversion rate used
          deliveryExpectedDate, // ✅ Use setting-based delivery date
          // ✅ Add payment currency and location
          paymentCurrency: finalPaymentCurrency,
          customerCountry: finalCustomerCountry,
          customerCity: finalCustomerCity,
          customerState: finalCustomerState,
          // ✅ Add discount if applied
          discount: finalDiscount || null,
          // ✅ CRITICAL: Store COMPLETE breakdown (CART CALCULATED - NEVER RECALCULATE)
          subtotal: displaySubtotal,
          subtotalAfterDiscount: displaySubtotal - displayDiscountAmount,
          taxableAmount: (displaySubtotal - displayDiscountAmount) + displayPfCost + displayPrintingCost,
        });
        
        // ✅ [DB CHECK] Verify phone persisted
        console.log('[DB CHECK - 50%] Saved addresses after Order.create():', {
          orderId: order.orderId || order._id,
          billingPhone: order.addresses?.billing?.phone || 'MISSING',
          billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
          shippingPhone: order.addresses?.shipping?.phone || 'MISSING',
          shippingMobileNumber: order.addresses?.shipping?.mobileNumber || 'MISSING',
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          const deliveryExpectedDate = await getEstimatedDeliveryDate();
          
          // ✅ Calculate complete breakdown for storage (NO RECALCULATION LATER)
          const itemsSubtotal = items.reduce((sum, item) => {
            const qty = Object.values(item.quantity || {}).reduce((a, b) => a + safeNum(b), 0);
            return sum + (qty * safeNum(item.price));
          }, 0);
          const discountAmount = finalDiscount?.amount || 0;
          const subtotalAfterDiscount = itemsSubtotal - discountAmount;
          const taxableAmount = subtotalAfterDiscount + finalPfCharge + finalPrintingCharge;
          
          order = await Order.create({
            products: cleanedItems,
            price: totalPay,
            totalPay: totalAmount, // ✅ Store FULL order amount, not advance
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
            paymentStatus: 'partial',
            totalAmount: totalAmount,
            advancePaidAmount: totalPay,
            remainingAmount: Math.max(totalAmount - totalPay, 0),
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: finalPfCharge,
            printing: finalPrintingCharge,
            gst: safeNum(orderData.gst, 0),
            orderType,
            currency, // ✅ Customer's currency
            displayPrice, // ✅ Price in customer's currency
            conversionRate, // ✅ Conversion rate used
            deliveryExpectedDate, // ✅ Use setting-based delivery date
            // ✅ Add payment currency and location
            paymentCurrency: finalPaymentCurrency,
            customerCountry: finalCustomerCountry,
            customerCity: finalCustomerCity,
            customerState: finalCustomerState,
            // ✅ Add discount if applied
            discount: finalDiscount || null,
            // ✅ CRITICAL: Store complete breakdown (CART CALCULATES ONCE, BACKEND STORES, PAGES DISPLAY)
            subtotal: itemsSubtotal,
            subtotalAfterDiscount: subtotalAfterDiscount,
            taxableAmount: taxableAmount,
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
          
          // ✅ [DB CHECK] Verify phone persisted in retry
          console.log('[DB CHECK - 50% RETRY] Saved addresses after Order.create():', {
            orderId: order.orderId || order._id,
            billingPhone: order.addresses?.billing?.phone || 'MISSING',
            billingMobileNumber: order.addresses?.billing?.mobileNumber || 'MISSING',
            shippingPhone: order.addresses?.shipping?.phone || 'MISSING',
            shippingMobileNumber: order.addresses?.shipping?.mobileNumber || 'MISSING',
          });
        } else {
          throw createError;
        }
      }

      try {
        await createTransaction(user, order._id, totalPay, '50%');
      } catch (error) {
        console.error('Wallet creation failed (halfpay):', error);
      }

      const settings = await getOrCreateSingleton();
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, finalPfCharge, finalPrintingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (50%):', e);
      }

      // ✅ Reduce stock after order creation
      try {
        await reduceProductStock(items);
      } catch (e) {
        console.error('Stock reduction failed (50%):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      // ✅ Save Cloudinary URLs to order (already uploaded above)
      if (Object.keys(designImages).length > 0) {
        order.designImages = designImages;
        await order.save();
        console.log('✅ Design images saved to order (50%)');
      }

      // ✅ Build invoice artifacts and send email IMMEDIATELY (non-blocking)
      const artifacts = await buildInvoiceArtifacts(order, req);
      
      // ✅ Send email immediately without blocking the response
      let emailQueued = false;
      if (artifacts?.customerEmail) {
        setImmediate(async () => {
          try {
            console.log('📧 Sending order confirmation email (50% payment)...');
            const emailResult = await sendOrderEmail(order, artifacts);
            if (emailResult.success) {
              console.log('✅ Email sent successfully');
            } else {
              console.warn('⚠️ Email sending failed:', emailResult.error);
            }
          } catch (err) {
            console.error('❌ Email sending error:', err.message);
          }
        });
        emailQueued = true;
        console.log('✅ Email queued for immediate delivery');
      }
      
      const whatsappResult = await sendAiSensyOrderMessage(order, artifacts);
      const notifications = {
        emailSent: emailQueued, // Mark as sent since it's queued
        emailError: emailQueued ? null : 'no_email_found',
        emailStatus: emailQueued ? 'sent' : 'failed',
        whatsappSent: !!whatsappResult.success,
        whatsappError: whatsappResult.success ? null : (whatsappResult.error || whatsappResult.message),
      };

      return res.status(200).json({ success: true, order, notifications });
    }

    // ✅ fallback if paymentmode didn't match
    return res
      .status(400)
      .json({ success: false, message: 'Invalid payment mode' });
  } catch (err) {
    console.error('💥 completeOrder failed:', err);

    // ✅ Clean up processing cache on error
    if (paymentId && paymentId !== 'manual_payment') {
      const cacheKey = `${paymentId}_${paymentmode}`;
      processingCache.delete(cacheKey);
    }

    return res
      .status(500)
      .json({ success: false, message: err.message || 'Internal error' });
  }
};

// ================================================================
// GET ORDER BY ID (with design + product enrichment)
// ================================================================
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const enriched = await Promise.all(
      (order.products || []).map(async (p) => {
        const product = { ...p };
        if (p.design && typeof p.design === 'string') {
          const d = await Design.findById(p.design).lean();
          if (d) product.design = d.design;
        }
        if (p.design_data) product.design = p.design_data;

        product.name =
          p.name ||
          p.products_name ||
          p.product_name ||
          p.product?.products_name ||
          'Unnamed Product';
        return product;
      })
    );

    order.items = enriched;
    return res.status(200).json(order);
  } catch (err) {
    console.error('❌ getOrderById failed:', err);
    return res.status(500).json({ message: err.message });
  }
};

// ================================================================
// GET ALL ORDERS (for Manage Orders dashboard)
// ================================================================
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    
    // ✅ FILTER OUT INVALID ORDERS: Remove orders with empty/invalid products
    const validOrders = orders.filter(order => {
      const products = order.products || [];
      const hasValidProduct = Array.isArray(products) && 
        products.length > 0 && 
        products[0] && 
        typeof products[0] === 'object' && 
        Object.keys(products[0]).length > 0;
      
      if (!hasValidProduct) {
        console.warn(`⚠️ getAllOrders filter: Excluding order ${order._id} - invalid products`);
      }
      
      return hasValidProduct;
    });

    const enrichedOrders = await Promise.all(
      validOrders.map(async (o) => {
        const enrichedProducts = await Promise.all(
          (o.products || []).map(async (p) => {
            const product = { ...p };
            if (p.design && typeof p.design === 'string') {
              const d = await Design.findById(p.design).lean();
              if (d) product.design = d.design;
            }
            if (p.design_data) product.design = p.design_data;
            product.name =
              p.name ||
              p.products_name ||
              p.product_name ||
              p.product?.products_name ||
              'Unnamed Product';
            return product;
          })
        );
        return { ...o, items: enrichedProducts };
      })
    );

    return res.status(200).json(enrichedOrders);
  } catch (err) {
    console.error('❌ getAllOrders failed:', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { completeOrder, getOrderById, getAllOrders };



