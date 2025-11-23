// controllers/printroveHelper.js
const axios = require('axios');
const { getPrintroveToken } = require('./printroveAuth');
const PrintroveIntegrationService = require('../Service/PrintroveIntegrationService');
const PrintroveSyncService = require('../Service/PrintroveSyncService');
const PrintrovePricingService = require('../Service/PrintrovePricingService');
const PrintroveProductCreationService = require('../Service/PrintroveProductCreationService');
const DesignProcessingService = require('../Service/DesignProcessingService');
require('dotenv').config();

// ✅ Initialize Axios instance
const printrove = axios.create({
  baseURL: process.env.PRINTROVE_BASE_URL || 'https://api.printrove.com/api',
  headers: { 'Content-Type': 'application/json' },
});

/* -------------------------------------------------------------------------- */
/* 🟡 HELPER FUNCTIONS                                                        */
/* -------------------------------------------------------------------------- */

// Map Printrove variant IDs to their corresponding product IDs
function getPrintroveProductIdFromVariant(variantId) {
  // Known mappings based on our earlier analysis
  const variantToProductMap = {
    // Women Crop Top variants (22094474-22094532) -> Product ID 807600
    22094474: 807600, 22094475: 807600, 22094476: 807600, 22094477: 807600, 22094478: 807600,
    22094479: 807600, 22094480: 807600, 22094481: 807600, 22094482: 807600, 22094483: 807600,
    22094484: 807600, 22094485: 807600, 22094486: 807600, 22094487: 807600, 22094488: 807600,
    22094489: 807600, 22094490: 807600, 22094491: 807600, 22094492: 807600, 22094493: 807600,
    22094494: 807600, 22094495: 807600, 22094496: 807600, 22094497: 807600, 22094498: 807600,
    22094499: 807600, 22094500: 807600, 22094501: 807600, 22094502: 807600, 22094503: 807600,
    22094504: 807600, 22094505: 807600, 22094506: 807600, 22094507: 807600, 22094508: 807600,
    22094509: 807600, 22094510: 807600, 22094511: 807600, 22094512: 807600, 22094513: 807600,
    22094514: 807600, 22094515: 807600, 22094516: 807600, 22094517: 807600, 22094518: 807600,
    22094519: 807600, 22094520: 807600, 22094521: 807600, 22094522: 807600, 22094523: 807600,
    22094524: 807600, 22094525: 807600, 22094526: 807600, 22094527: 807600, 22094528: 807600,
    22094529: 807600, 22094530: 807600, 22094531: 807600, 22094532: 807600,
  };
  
  return variantToProductMap[variantId] || null;
}

/* -------------------------------------------------------------------------- */
/* 🟡 TEST PRINTROVE CONNECTION                                               */
/* -------------------------------------------------------------------------- */
async function testPrintroveConnection() {
  try {
    console.log('🧪 Testing Printrove connection...');
    const token = await getPrintroveToken();
    console.log('✅ Printrove token obtained successfully');

    const products = await listPrintroveProducts();
    console.log(
      '✅ Printrove products fetched:',
      products?.products?.length || 0
    );

    return {
      success: true,
      token: token ? 'Valid' : 'Invalid',
      productsCount: products?.products?.length || 0,
    };
  } catch (err) {
    console.error('❌ Printrove connection test failed:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPLOAD DESIGN TO PRINTROVE (Real Implementation)                        */
/* -------------------------------------------------------------------------- */
async function uploadDesignToPrintrove(designImage, designName = 'Design') {
  const token = await getPrintroveToken();

  try {
    console.log('📤 Uploading design to Printrove:', designName);

    // Check if designImage is a base64 string or URL
    const isBase64 = designImage.startsWith('data:image/');
    const isUrl =
      designImage.startsWith('http://') || designImage.startsWith('https://');

    let designId;

    if (isBase64) {
      // Handle base64 image data
      designId = await uploadDesignFromBase64(designImage, designName, token);
    } else if (isUrl) {
      // Handle URL-based image
      designId = await uploadDesignFromUrl(designImage, designName, token);
    } else {
      throw new Error(
        'Invalid image format. Expected base64 data URL or HTTP URL.'
      );
    }

    console.log(`✅ Design uploaded successfully with ID: ${designId}`);
    return {
      id: designId,
      name: designName,
    };
  } catch (err) {
    console.error('❌ Error uploading design to Printrove:', err.message);
    throw new Error(`Design upload failed: ${err.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPLOAD DESIGN FROM BASE64                                               */
/* -------------------------------------------------------------------------- */
async function uploadDesignFromBase64(base64Data, designName, token) {
  try {
    // Extract the base64 data and mime type
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 data format');
    }

    const mimeType = matches[1];
    const base64String = matches[2];

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64String, 'base64');

    // Create form data for file upload
    const FormData = require('form-data');
    const form = new FormData();

    form.append('file', imageBuffer, {
      filename: `${designName}.${mimeType.split('/')[1]}`,
      contentType: mimeType,
    });
    form.append('name', designName);

    console.log(
      `📤 Uploading base64 design: ${designName} (${imageBuffer.length} bytes)`
    );

    const response = await printrove.post('/external/designs', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📤 Design upload response:', response.data);

    if (response.data && response.data.design && response.data.design.id) {
      return response.data.design.id;
    } else {
      throw new Error('Invalid response from Printrove design upload');
    }
  } catch (err) {
    console.error('❌ Error uploading base64 design:', err.message);
    if (err.response) {
      console.error('❌ Response data:', err.response.data);
      console.error('❌ Response status:', err.response.status);
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPLOAD DESIGN FROM URL                                                  */
/* -------------------------------------------------------------------------- */
async function uploadDesignFromUrl(imageUrl, designName, token) {
  try {
    console.log(`📤 Uploading design from URL: ${imageUrl}`);

    const response = await printrove.post(
      '/external/designs/url',
      {
        url: imageUrl,
        name: designName,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.design && response.data.design.id) {
      return response.data.design.id;
    } else {
      throw new Error('Invalid response from Printrove design upload');
    }
  } catch (err) {
    console.error('❌ Error uploading design from URL:', err.message);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE ORDER (Corrected Format for Printrove API v1)                    */
/* -------------------------------------------------------------------------- */
async function createPrintroveOrder(order) {
  const o = order.toObject ? order.toObject() : order;
  
  console.log('🚀 Creating Printrove order using new integration service...');
  
  try {
    // Use the new integration service
    const result = await PrintroveIntegrationService.createOrder(o);
    console.log('✅ New integration service succeeded, returning result');
    return result;
  } catch (error) {
    console.error('❌ New integration service failed, falling back to legacy method:', error.message);
    
    // Fallback to legacy method
    console.log('🔄 Using legacy method as fallback...');
    return await createPrintroveOrderLegacy(order);
  }
}

// Legacy method as fallback
async function createPrintroveOrderLegacy(order) {
  const token = await getPrintroveToken();
  const o = order.toObject ? order.toObject() : order;

  console.log('🔍 RAW ORDER DATA FROM FRONTEND:', {
    orderId: o._id,
    razorpayPaymentId: o.razorpayPaymentId,
    products: o.products?.map((p, idx) => ({
      index: idx,
      id: p.id || p._id,
      name: p.name || p.products_name,
      color: p.color,
      quantity: p.quantity,
      printroveVariantsBySize: p.printroveVariantsBySize,
      printroveLineItems: p.printroveLineItems,
      hasPrintroveMapping: !!(p.printroveVariantsBySize || p.printroveLineItems)
    })),
    address: o.address,
    user: o.user,
    totalPay: o.totalPay,
    pf: o.pf,
    gst: o.gst,
    printing: o.printing,
  });

  console.log('🔍 Order data for Printrove:', {
    orderId: o._id,
    products: o.products?.length || 0,
    address: o.address,
  });

  // ✅ Calculate total retail price from order (use actual order total)
  let totalRetailPrice = Number(o.totalPay) || 0;

  // ✅ Fallback: Calculate from products if totalPay is missing
  if (totalRetailPrice <= 0) {
    console.warn(
      '⚠️ totalPay is missing or invalid, calculating from products...'
    );
    totalRetailPrice = (o.products || []).reduce((total, p) => {
      const qty =
        typeof p.quantity === 'object'
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1;
      return total + (Number(p.price) || 0) * qty;
    }, 0);

    // Add additional charges if available
    if (o.pf && o.printing) {
      totalRetailPrice += (Number(o.pf) || 0) + (Number(o.printing) || 0);
    }

    // Add GST if available
    if (o.gst && totalRetailPrice > 0) {
      const gstAmount = (totalRetailPrice * Number(o.gst)) / 100;
      totalRetailPrice += gstAmount;
    }

    console.log('💰 Calculated totalRetailPrice from products:', {
      productTotal: totalRetailPrice,
      pf: o.pf,
      printing: o.printing,
      gst: o.gst,
    });
  }

  console.log('💰 Pricing Calculation:', {
    frontendTotalPay: o.totalPay,
    calculatedRetailPrice: totalRetailPrice,
    products: (o.products || []).map((p) => ({
      price: p.price,
      quantity: p.quantity,
      total:
        (Number(p.price) || 0) *
        (typeof p.quantity === 'object'
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1),
    })),
  });

  // ✅ Calculate Printrove cost for validation
  let printroveCost = null;
  try {
    const orderProducts = (o.products || [])
      .map((p) => ({
        printroveVariantId: p.printroveVariantsBySize
          ? Object.values(p.printroveVariantsBySize)[0]
          : null,
        variant_id: p.printroveVariantsBySize
          ? Object.values(p.printroveVariantsBySize)[0]
          : null,
        quantity:
          typeof p.quantity === 'object'
            ? Object.values(p.quantity || {}).reduce(
                (a, b) => a + Number(b || 0),
                0
              )
            : Number(p.quantity) || 1,
      }))
      .filter((p) => p.printroveVariantId || p.variant_id);

    if (orderProducts.length > 0) {
      const costData = await PrintrovePricingService.calculateOrderCost(
        orderProducts
      );
      printroveCost = costData.totalCost;

      // Validate pricing
      const validation = PrintrovePricingService.validatePricing(
        totalRetailPrice,
        printroveCost
      );
      if (!validation.isValid) {
        console.warn('⚠️ Pricing validation failed:', validation.message);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not calculate Printrove cost:', error.message);
  }

  // ✅ Determine if international order
  const customerCountry = o.address?.country || 'India';
  const isInternational = !['India', 'india', 'IN', 'IND', 'Bharat', 'bharat'].includes(customerCountry);
  
  // ✅ For international orders, pincode should be string; for India, it should be integer
  let pincodeValue;
  if (isInternational) {
    // International: Keep as string
    pincodeValue = String(o.address?.pincode || o.address?.postalCode || '00000');
  } else {
    // India: Convert to integer (6 digits)
    pincodeValue = parseInt(o.address?.pincode || o.address?.postalCode || '110019');
  }
  
  // ✅ Validate required fields for international orders
  if (isInternational) {
    if (!o.address?.state) {
      console.warn('⚠️ State is missing for international order, using default');
    }
    if (!o.address?.city) {
      console.warn('⚠️ City is missing for international order, using default');
    }
  }
  
  console.log(`🌍 Order type: ${isInternational ? 'INTERNATIONAL' : 'DOMESTIC'}`, {
    country: customerCountry,
    pincode: pincodeValue,
    pincodeType: typeof pincodeValue,
    state: o.address?.state,
    city: o.address?.city
  });

  // ✅ Build Printrove-compliant payload according to API docs
  const payload = {
    reference_number: o.razorpayPaymentId || o._id || `ORD-${Date.now()}`,
    retail_price: Math.max(totalRetailPrice, 1), // Use actual order total, minimum 1 rupee
    customer: {
      name: o.address?.fullName || o.address?.name || 'Duco Customer',
      email: o.address?.email || 'noemail@duco.com',
      number: parseInt(
        o.address?.mobileNumber || o.address?.phone || '9999999999'
      ),
      address1: (() => {
        // Simplified address formatting for Printrove
        const house = (o.address?.houseNumber || '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        const street = (o.address?.street || '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        
        // Create a clean, simple address
        let address = `${house} ${street}`.replace(/\s+/g, ' ').trim();
        
        // Keep it short and simple (max 40 characters to be safe)
        if (address.length > 40) {
          address = address.substring(0, 40).trim();
        }
        
        return address || 'Customer Address';
      })(),
      address2: (() => {
        // Keep address2 simple
        const landmark = (o.address?.landmark || '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        if (landmark) {
          return landmark.length > 30 ? landmark.substring(0, 30).trim() : landmark;
        }
        return 'Near City Center';
      })(),
      address3: '',
      pincode: pincodeValue,
      state: o.address?.state || (isInternational ? 'State' : 'Delhi'),
      city: o.address?.city || (isInternational ? 'City' : 'New Delhi'),
      country: customerCountry,
    },
    cod: false, // Required field - set to false for online payments
    order_products: await Promise.all(
      (o.products || []).map(async (p, index) => {
        const qty =
          typeof p.quantity === 'object'
            ? Object.values(p.quantity || {}).reduce(
                (a, b) => a + Number(b || 0),
                0
              )
            : Number(p.quantity) || 1;

        // ✅ Get product information using new product creation service
        const ducoProductId = p.productId || p._id || p.id;
        const firstSize = Object.keys(p.quantity || {})[0];

        console.log(
          `🔍 Processing product ${index + 1}: ${ducoProductId}, color: ${
            p.color
          }, size: ${firstSize}`
        );

        let productInfo = null;
        let printroveVariantId = null;
        let isPlain = true;

        try {
          // Use the new product creation service to get or create product
          productInfo =
            await PrintroveProductCreationService.getOrCreateProduct(
              {
                ducoProductId,
                color: p.color,
                size: firstSize,
                design: p.design,
              },
              token
            );

          printroveVariantId = productInfo.variantId;
          isPlain = productInfo.isPlain;

          console.log(`✅ Product info obtained:`, {
            productId: productInfo.productId,
            variantId: productInfo.variantId,
            isPlain: productInfo.isPlain,
            sku: productInfo.sku,
          });

          // ✅ Process design data for custom products
          if (p.design && !isPlain) {
            try {
              const designSummary =
                DesignProcessingService.generateDesignSummary(p.design);
              console.log('🎨 Design summary:', designSummary);

              // Store design processing info for order fulfillment
              p.designProcessing = {
                summary: designSummary,
                printInstructions:
                  DesignProcessingService.createPrintReadyDesign(p.design),
                processedAt: new Date().toISOString(),
              };

              console.log('✅ Design data processed and stored for printing');
            } catch (designError) {
              console.warn('⚠️ Design processing failed:', designError.message);
            }
          }
        } catch (err) {
          console.warn(
            `⚠️ Product creation failed for ${ducoProductId}, using fallback:`,
            err.message
          );

          // Fallback to plain product
          try {
            printroveVariantId =
              await PrintroveSyncService.getPrintroveVariantId(
                ducoProductId,
                p.color,
                firstSize
              );
            isPlain = true;
            console.log(
              `🔄 Fallback variant lookup result: ${printroveVariantId}`
            );
          } catch (fallbackErr) {
            console.warn(
              `⚠️ Fallback variant lookup also failed:`,
              fallbackErr.message
            );
          }

          // ✅ Process design data even for fallback products
          if (p.design) {
            try {
              const designSummary =
                DesignProcessingService.generateDesignSummary(p.design);
              console.log('🎨 Design summary (fallback):', designSummary);

              // Store design processing info for order fulfillment
              p.designProcessing = {
                summary: designSummary,
                printInstructions:
                  DesignProcessingService.createPrintReadyDesign(p.design),
                processedAt: new Date().toISOString(),
                isFallback: true,
              };

              console.log(
                '✅ Design data processed and stored for printing (fallback mode)'
              );
            } catch (designError) {
              console.warn(
                '⚠️ Design processing failed (fallback):',
                designError.message
              );
            }
          }
        }

        // ✅ Try to get variant ID from product's printrove mapping (from frontend)
        if (!printroveVariantId && p.printroveVariantsBySize) {
          // Try to find variant for the specific size first
          printroveVariantId = p.printroveVariantsBySize[firstSize];
          
          // If not found for specific size, try any available variant
          if (!printroveVariantId) {
            const availableVariants = Object.values(p.printroveVariantsBySize).filter(Boolean);
            if (availableVariants.length > 0) {
              printroveVariantId = availableVariants[0];
              console.log(`🔍 Using available variant from mapping: ${printroveVariantId}`);
            }
          } else {
            console.log(`🔍 Found variant for size ${firstSize}: ${printroveVariantId}`);
          }
        }

        // ✅ Try to get variant ID from printroveLineItems (from frontend)
        if (!printroveVariantId && p.printroveLineItems) {
          const lineItem = p.printroveLineItems.find(item => 
            item.size === firstSize || item.printroveVariantId
          );
          if (lineItem && lineItem.printroveVariantId) {
            printroveVariantId = lineItem.printroveVariantId;
            console.log(`🔍 Found variant from line items: ${printroveVariantId}`);
          }
        }

        // ✅ Final fallback if no variant found
        if (!printroveVariantId) {
          console.warn(
            `⚠️ No Printrove variant found for product ${ducoProductId}, using fallback...`
          );
          const fallbackVariantId = 22094474;
          console.log(`✅ Using fallback variant ID: ${fallbackVariantId}`);
          printroveVariantId = fallbackVariantId;
        }

        console.log(`📦 Product ${index + 1} for Printrove:`, {
          ducoProductId,
          printroveVariantId,
          quantity: qty,
          isPlain,
          color: p.color,
          size: firstSize,
          productInfo: productInfo,
        });

        // ✅ Build order product according to Printrove API structure
        const orderProduct = {
          quantity: qty,
          is_plain: isPlain,
        };

        // ✅ Use only variant_id for Printrove orders (product_id causes validation errors)
        if (printroveVariantId) {
          orderProduct.variant_id = printroveVariantId;
          console.log(`✅ Using variant_id: ${printroveVariantId}`);
          
          // Add design information if available (without product_id)
          if (productInfo && productInfo.design && Object.keys(productInfo.design).length > 0) {
            orderProduct.design = productInfo.design;
            console.log(`✅ Including design information:`, {
              hasFront: !!productInfo.design.front,
              hasBack: !!productInfo.design.back,
              frontId: productInfo.design.front?.id,
              backId: productInfo.design.back?.id,
            });
          }
        } else {
          console.error(`❌ No valid variant ID for product ${ducoProductId}`);
          throw new Error(
            `Missing required variant ID for ${ducoProductId}`
          );
        }

        return orderProduct;
      })
    ),
  };

  // ✅ Filter out null products and validate
  payload.order_products = payload.order_products.filter((p) => p !== null);

  if (!payload.order_products || payload.order_products.length === 0) {
    throw new Error('No valid products found for Printrove order');
  }

  // Check if all products have valid variant IDs
  const invalidProducts = payload.order_products.filter((p) => !p.variant_id);
  if (invalidProducts.length > 0) {
    console.warn(
      '⚠️ Some products have invalid Printrove variant IDs:',
      invalidProducts
    );
  }

  // ✅ Production-ready validation
  if (totalRetailPrice <= 0) {
    console.error('❌ CRITICAL: Invalid retail price calculation:', {
      totalRetailPrice,
      originalTotalPay: o.totalPay,
      products: (o.products || []).map((p) => ({
        id: p.id || p._id,
        price: p.price,
        quantity: p.quantity,
        calculated:
          (Number(p.price) || 0) *
          (typeof p.quantity === 'object'
            ? Object.values(p.quantity || {}).reduce(
                (a, b) => a + Number(b || 0),
                0
              )
            : Number(p.quantity) || 1),
      })),
    });
    throw new Error(
      `Invalid retail price: ${totalRetailPrice} INR. Check product pricing.`
    );
  }

  if (totalRetailPrice > 100000) {
    console.warn(`⚠️ High retail price detected: ${totalRetailPrice} INR`);
  }

  // ✅ Additional production validations
  if (totalRetailPrice < 1) {
    console.warn('⚠️ Very low retail price detected, using minimum value');
    totalRetailPrice = 1;
  }

  console.log('📦 Final payload details:', {
    reference_number: payload.reference_number,
    retail_price: payload.retail_price,
    printrove_cost: printroveCost,
    cost_difference: printroveCost
      ? Math.abs(payload.retail_price - printroveCost)
      : null,
    cod: payload.cod,
    product_count: payload.order_products.length,
    products: payload.order_products.map((p) => ({
      variant_id: p.variant_id,
      quantity: p.quantity,
      is_plain: p.is_plain,
    })),
  });

  // Debug address formatting and validation
  console.log('🏠 Address formatting debug:', {
    originalHouse: o.address?.houseNumber,
    originalStreet: o.address?.street,
    formattedAddress1: payload.customer.address1,
    formattedAddress2: payload.customer.address2,
    address1Length: payload.customer.address1?.length,
    address2Length: payload.customer.address2?.length
  });

  // Validate all customer fields
  console.log('👤 Customer validation:', {
    name: payload.customer.name,
    nameLength: payload.customer.name?.length,
    email: payload.customer.email,
    emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.customer.email),
    number: payload.customer.number,
    numberValid: !isNaN(payload.customer.number) && payload.customer.number > 1000000000,
    pincode: payload.customer.pincode,
    pincodeValid: !isNaN(payload.customer.pincode) && payload.customer.pincode > 100000,
    state: payload.customer.state,
    city: payload.customer.city,
    country: payload.customer.country
  });

  console.log(
    '📦 Sending payload to Printrove:',
    JSON.stringify(payload, null, 2)
  );

  try {
    const res = await axios.post(
      'https://api.printrove.com/api/external/orders',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log('✅ Printrove order created successfully:', {
      orderId: res.data?.id,
      status: res.data?.status,
      retailPrice: payload.retail_price,
      productCount: payload.order_products.length,
    });
    return res.data;
  } catch (err) {
    console.error('❌ Error creating Printrove order:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message,
      payload: JSON.stringify(payload, null, 2),
    });

    // Log specific design validation errors
    if (err.response?.data?.errors?.['order_products.0.design']) {
      console.error(
        '❌ Design validation errors:',
        err.response.data.errors['order_products.0.design']
      );
    }

    // More specific error messages
    if (err.response?.status === 401) {
      throw new Error('Printrove authentication failed - check credentials');
    } else if (err.response?.status === 400) {
      throw new Error(
        `Printrove validation error: ${
          err.response?.data?.message || 'Invalid request format'
        }`
      );
    } else if (err.response?.status === 404) {
      throw new Error(
        'Printrove product or variant not found - check product IDs'
      );
    } else {
      throw new Error(
        `Printrove order creation failed: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 🟣 FETCH ALL PRINTROVE PRODUCTS                                            */
/* -------------------------------------------------------------------------- */
async function listPrintroveProducts() {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get('/external/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      '✅ Printrove Products fetched:',
      res.data?.products?.length || 0
    );
    return res.data;
  } catch (err) {
    console.error(
      '❌ Failed to fetch Printrove products:',
      err.response?.data || err.message
    );
    throw new Error('Failed to fetch Printrove products');
  }
}

/* -------------------------------------------------------------------------- */
/* 🟤 FETCH SINGLE PRODUCT (variants)                                         */
/* -------------------------------------------------------------------------- */
async function getPrintroveProduct(productId) {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get(`/external/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Printrove Product (${productId}) fetched successfully.`);
    return res.data;
  } catch (err) {
    console.error(
      '❌ Failed to fetch Printrove product:',
      err.response?.data || err.message
    );
    throw new Error('Failed to fetch Printrove product');
  }
}

/* -------------------------------------------------------------------------- */
/* 🟠 COMBINED: PRODUCT + VARIANTS                                            */
/* -------------------------------------------------------------------------- */
async function listPrintroveProductsWithVariants() {
  const baseList = await listPrintroveProducts();
  const products = baseList?.products || [];
  const detailed = [];

  for (const p of products) {
    try {
      const detail = await getPrintroveProduct(p.id);

      console.log(
        `🧩 Printrove Product ${p.id} example variant:`,
        detail?.product?.variants?.[0]
      );

      detailed.push({
        id: p.id,
        name: p.name,
        variants:
          detail?.product?.variants?.map((v) => ({
            id: v.id,
            color:
              v.color ||
              v.product?.color ||
              v.attributes?.color ||
              (v.sku && v.sku.split(' ')[1]) ||
              '',
            size:
              v.size ||
              v.product?.size ||
              v.attributes?.size ||
              (v.sku && v.sku.split(' ')[2]) ||
              '',
            mockup_front: v.mockup?.front_mockup || '',
            mockup_back: v.mockup?.back_mockup || '',
          })) || [],
      });
    } catch (err) {
      console.warn(`⚠️ Could not fetch variants for product ${p.id}`);
      detailed.push({ id: p.id, name: p.name, variants: [] });
    }
  }

  return detailed;
}

/* -------------------------------------------------------------------------- */
/* ✅ EXPORT MODULES                                                          */
/* -------------------------------------------------------------------------- */
module.exports = {
  createPrintroveOrder,
  uploadDesignToPrintrove,
  testPrintroveConnection,
  listPrintroveProducts,
  getPrintroveProduct,
  listPrintroveProductsWithVariants,
};
