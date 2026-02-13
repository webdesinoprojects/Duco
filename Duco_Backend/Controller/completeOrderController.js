const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');
const Design = require('../DataBase/Models/DesignModel');
const Product = require('../DataBase/Models/ProductsModel');
const CorporateSettings = require('../DataBase/Models/CorporateSettings');
const { createInvoice, getInvoiceByOrderId } = require('./invoiceService');
const { getOrCreateSingleton } = require('../Router/DataRoutes');
const { createTransaction } = require('./walletController');
const { calculateOrderTotal } = require('../Service/TaxCalculationService');
const LZString = require('lz-string'); // ✅ added for decompression
const { uploadDesignPreviewImages } = require('../utils/cloudinaryUpload'); // ✅ Cloudinary upload
const whatsappService = require('../Service/WhatsAppService'); // ✅ WhatsApp notifications
const emailService = require('../Service/EmailService'); // ✅ Email notifications
const invoicePDFService = require('../Service/InvoicePDFService'); // ✅ PDF generation

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
    
    // ✅ Priority: pricing array (actual product price) > p.price (cart price)
    let itemPrice = 0;
    if (p.pricing && Array.isArray(p.pricing) && p.pricing.length > 0) {
      itemPrice = safeNum(p.pricing[0]?.price_per, 0);
    }
    // Fallback to p.price if pricing array doesn't have valid price
    if (itemPrice === 0) {
      itemPrice = safeNum(p.price, 0);
    }
    
    console.log(`📦 Invoice item: ${p.products_name || p.name || 'Item'} - Price: ${itemPrice} (from ${p.pricing ? 'pricing array' : 'p.price'})`);
    
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
      const normalizedColor = typeof color === 'string' ? color.toLowerCase().trim() : '';

      // Find the matching color in product's image_url array
      let colorFound = false;
      let colorItem = null;

      for (const imageItem of product.image_url) {
        const imageColor = typeof imageItem.color === 'string' ? imageItem.color.toLowerCase().trim() : '';
        const imageColorCode = typeof imageItem.colorcode === 'string' ? imageItem.colorcode.toLowerCase().trim() : '';
        
        if (imageColor === normalizedColor || imageColorCode === normalizedColor) {
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

        for (const contentItem of colorItem.content) {
          if (contentItem.size === size) {
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
        const imageColor = typeof imageItem.color === 'string' ? imageItem.color.toLowerCase().trim() : '';
        const imageColorCode = typeof imageItem.colorcode === 'string' ? imageItem.colorcode.toLowerCase().trim() : '';
        
        if (imageColor === normalizedColor || imageColorCode === normalizedColor) {
          colorFound = true;
          colorItem = imageItem;
          console.log(`  ✅ Color match found: "${imageColor}" or "${imageColorCode}"`);
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

        let sizeFound = false;
        let availableStock = 0;

        for (const contentItem of colorItem.content) {
          if (contentItem.size === size) {
            sizeFound = true;
            availableStock = contentItem.minstock || 0;
            console.log(`    ✅ Size match found: "${size}", stock: ${availableStock}, needed: ${quantity}`);
            
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

// ✅ WhatsApp Order Confirmation Helper
// NON-BLOCKING: Failures must NOT affect order success
async function sendWhatsAppOrderConfirmation(order) {
  try {
    console.log('📱 Starting WhatsApp order confirmation...');
    
    // Extract customer phone number
    const customerPhone = 
      order.addresses?.billing?.mobileNumber || 
      order.address?.mobileNumber || 
      order.user?.phone;
    
    if (!customerPhone) {
      console.warn('⚠️ No customer phone number found, skipping WhatsApp');
      return;
    }

    // Extract customer name
    const customerName = 
      order.addresses?.billing?.fullName || 
      order.address?.fullName || 
      order.user?.name || 
      'Valued Customer';

    // Get invoice data
    console.log('📄 Fetching invoice data...');
    const { invoice, totals } = await getInvoiceByOrderId(order._id);
    
    if (!invoice) {
      console.warn('⚠️ Invoice not found, skipping WhatsApp');
      return;
    }

    // Prepare invoice data for PDF generation
    const invoiceData = {
      company: invoice.company,
      invoice: invoice.invoice,
      billTo: invoice.billTo,
      shipTo: invoice.shipTo,
      items: invoice.items,
      charges: invoice.charges,
      tax: invoice.tax,
      subtotal: totals.subtotal,
      total: totals.grandTotal,
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
      // ✅ Add discount if applied
      discount: order.discount || null,
    };

    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfPath = await invoicePDFService.generatePDF(invoiceData, order.orderId || order._id);
    
    // Send WhatsApp message with PDF
    console.log('📤 Sending WhatsApp message...');
    const result = await whatsappService.sendOrderConfirmation(
      customerPhone,
      order.orderId || order._id,
      pdfPath,
      {
        customerName,
        totalAmount: totals.grandTotal.toFixed(2),
        currency: invoice.currency || 'INR',
        paymentMode: invoice.paymentmode || 'Online',
      }
    );

    if (result.success) {
      console.log('✅ WhatsApp order confirmation sent successfully');
    } else {
      console.warn('⚠️ WhatsApp send failed:', result.reason);
    }

    // Send Email with invoice PDF
    console.log('📧 Sending order confirmation email...');
    const customerEmail = order.customerPersonalInfo?.customerEmail || order.email;
    if (customerEmail) {
      const emailResult = await emailService.sendOrderConfirmation({
        customerEmail,
        customerName,
        orderId: order.orderId || order._id,
        totalAmount: totals.grandTotal.toFixed(2),
        currency: invoice.currency || 'INR',
        paymentMode: invoice.paymentmode || 'Online',
        invoicePdfPath: pdfPath,
        items: invoice.items || [],
      });

      if (emailResult.success) {
        console.log('✅ Order confirmation email sent successfully');
      } else {
        console.warn('⚠️ Email send failed:', emailResult.error);
      }
    } else {
      console.warn('⚠️ No customer email found, skipping email notification');
    }
  } catch (error) {
    // ✅ CRITICAL: Log error but DO NOT throw - Notification failures must not affect order
    console.error('❌ Notification failed (non-blocking):', error.message);
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
  
  // ✅ Extract GST/Tax number from orderData if provided
  const gstNumber = orderData?.gstNumber?.trim() || billingAddr?.gstNumber?.trim() || '';
  
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
      gstin: gstNumber, // ✅ Use customer's GST number if provided
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

async function verifyRazorpayPayment(paymentId, expectedAmountINR) {
  if (!paymentId) throw new Error('Missing paymentId');
  const payment = await razorpay.payments.fetch(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'captured') {
    throw new Error(`Payment not captured (status: ${payment.status})`);
  }
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
          email: orderData.addresses.billing?.email || orderData.user?.email || 'not_provided@duco.com'
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
        email: orderData.address?.email || orderData.user?.email || 'not_provided@duco.com'
      };
      console.log('⚠️ Using legacy address format:', legacyAddress.fullName);
    }

    const user =
      typeof orderData.user === 'object'
        ? orderData.user._id
        : orderData.user?.toString?.() || orderData.user;

    // ✅ Detect currency from billing address country
    const billingCountry = addresses?.billing?.country || legacyAddress?.country || 'India';
    const currency = getCurrencyFromCountry(billingCountry);
    
    // ✅ Use payment currency from frontend if provided, otherwise detect from country
    const finalPaymentCurrency = paymentCurrency || currency;
    const finalCustomerCountry = customerCountry || billingCountry;
    const finalCustomerCity = customerCity || '';
    const finalCustomerState = customerState || '';
    
    console.log('💱 Payment Currency & Location:', {
      paymentCurrency: finalPaymentCurrency,
      customerCountry: finalCustomerCountry,
      customerCity: finalCustomerCity,
      customerState: finalCustomerState,
      billingCountry,
      detectedCurrency: currency,
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
    // CASE 1 – STORE PICKUP (NEW)
    // ================================================================
    if (paymentmode === 'store_pickup' || paymentmode === 'pickup') {
      try {
        // ✅ Get estimated delivery date from settings
        const deliveryExpectedDate = await getEstimatedDeliveryDate();
        
        const orderPayload = {
          products: cleanedItems,
          price: totalPay, // INR price (for Razorpay)
          totalPay: totalPay,
          user,
          status: 'Pending',
          paymentStatus: 'Pending', // ✅ Manual payment methods start as Pending
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: finalPfCharge,
          gst: safeNum(orderData.gst, 0),
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
        };
        
        // ✅ Add addresses (new format) or address (legacy format)
        if (addresses) {
          orderPayload.addresses = addresses;
        } else if (legacyAddress) {
          orderPayload.address = legacyAddress;
        }
        
        order = await Order.create(orderPayload);
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          const deliveryExpectedDate = await getEstimatedDeliveryDate();
          order = await Order.create({
            products: cleanedItems,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            status: 'Pending',
            paymentStatus: 'Pending', // ✅ Manual payment methods start as Pending
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: finalPfCharge,
            gst: safeNum(orderData.gst, 0),
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
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
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

      // ✅ Send WhatsApp order confirmation (non-blocking)
      sendWhatsAppOrderConfirmation(order).catch(err => {
        console.error('WhatsApp send failed (non-blocking):', err.message);
      });

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 2 – NETBANKING
    // ================================================================
    if (paymentmode === 'netbanking') {
      // ✅ Get estimated delivery date from settings
      const deliveryExpectedDate = await getEstimatedDeliveryDate();
      
      order = await Order.create({
        products: cleanedItems,
        price: totalPay,
        totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
        ...(addresses ? { addresses } : { address: legacyAddress }),
        user,
        razorpayPaymentId: paymentId || null,
        status: 'Pending',
        paymentStatus: 'Pending', // ✅ Netbanking starts as Pending until bank confirms
        paymentmode: paymentmode, // ✅ Use enum value, not readableMode
        pf: finalPfCharge,
        printing: finalPrintingCharge,
        gst: safeNum(orderData.gst, 0),
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

      // ✅ Send WhatsApp order confirmation (non-blocking)
      sendWhatsAppOrderConfirmation(order).catch(err => {
        console.error('WhatsApp send failed (non-blocking):', err.message);
      });

      return res.status(200).json({ success: true, order });
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
        
        order = await Order.create({
          products: cleanedItems,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          ...(addresses ? { addresses } : { address: legacyAddress }),
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentStatus: 'Paid', // ✅ Online payments are immediately Paid
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
          discount: discount || null,
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          const deliveryExpectedDate = await getEstimatedDeliveryDate();
          order = await Order.create({
            products: cleanedItems,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
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
            discount: discount || null,
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

      // ✅ Send WhatsApp order confirmation (non-blocking)
      sendWhatsAppOrderConfirmation(order).catch(err => {
        console.error('WhatsApp send failed (non-blocking):', err.message);
      });

      return res.status(200).json({ success: true, order });
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
        
        order = await Order.create({
          products: cleanedItems,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          ...(addresses ? { addresses } : { address: legacyAddress }),
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentStatus: 'Paid', // ✅ 50% payment - advance paid via Razorpay
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
          discount: discount || null,
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          const deliveryExpectedDate = await getEstimatedDeliveryDate();
          order = await Order.create({
            products: cleanedItems,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
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
            discount: discount || null,
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
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

      // ✅ Send WhatsApp order confirmation (non-blocking)
      sendWhatsAppOrderConfirmation(order).catch(err => {
        console.error('WhatsApp send failed (non-blocking):', err.message);
      });

      return res.status(200).json({ success: true, order });
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



