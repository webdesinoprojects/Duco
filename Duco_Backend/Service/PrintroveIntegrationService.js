// Service for Printrove Integration
const axios = require('axios');
const PrintroveMapping = require('../DataBase/Models/PrintroveMappingModel');
const Product = require('../DataBase/Models/ProductsModel');
const { getPrintroveToken } = require('../Controller/printroveAuth');

class PrintroveIntegrationService {
  constructor() {
    this.baseURL = 'https://api.printrove.com/api/external';
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      this.token = await getPrintroveToken();
    }
    return this.token;
  }

  async makeRequest(method, endpoint, data = null) {
    const token = await this.getToken();
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Printrove API Error (${method} ${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  // Get all Printrove categories
  async getCategories() {
    return await this.makeRequest('GET', '/categories');
  }

  // Get products in a category
  async getCategoryProducts(categoryId) {
    return await this.makeRequest('GET', `/categories/${categoryId}`);
  }

  // Get product variants
  async getProductVariants(categoryId, productId) {
    return await this.makeRequest('GET', `/categories/${categoryId}/products/${productId}`);
  }

  // Upload design to Printrove
  async uploadDesign(designImage, designName) {
    try {
      // Handle base64 images
      if (designImage.startsWith('data:image/')) {
        const matches = designImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid base64 image format');
        }

        const mimeType = matches[1];
        const base64String = matches[2];
        const imageBuffer = Buffer.from(base64String, 'base64');

        const FormData = require('form-data');
        const form = new FormData();
        
        form.append('file', imageBuffer, {
          filename: `${designName}.${mimeType.split('/')[1]}`,
          contentType: mimeType,
        });

        const token = await this.getToken();
        const response = await axios.post(`${this.baseURL}/designs`, form, {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`,
          },
        });

        return response.data.design;
      } else if (designImage.startsWith('http')) {
        // Handle URL-based images
        return await this.makeRequest('POST', '/designs/url', {
          url: designImage,
          name: designName
        });
      } else {
        throw new Error('Invalid image format. Expected base64 data URL or HTTP URL.');
      }
    } catch (error) {
      console.error('Error uploading design to Printrove:', error.message);
      throw error;
    }
  }

  // Create mapping for a Duco product
  async createProductMapping(ducoProductId, printroveProductId, variants = []) {
    try {
      // Check if mapping already exists
      const existingMapping = await PrintroveMapping.findOne({ ducoProductId });
      if (existingMapping) {
        throw new Error('Mapping already exists for this product');
      }

      // Get Printrove product details
      const categories = await this.getCategories();
      let printroveProduct = null;
      let categoryId = null;

      // Find the product in categories
      for (const category of categories.categories || []) {
        const categoryProducts = await this.getCategoryProducts(category.id);
        const product = categoryProducts.products?.find(p => p.id === printroveProductId);
        if (product) {
          printroveProduct = product;
          categoryId = category.id;
          break;
        }
      }

      if (!printroveProduct) {
        throw new Error(`Printrove product ${printroveProductId} not found`);
      }

      // Get variants if not provided
      if (variants.length === 0) {
        const variantData = await this.getProductVariants(categoryId, printroveProductId);
        variants = variantData.variants || [];
      }

      // Create mapping
      const mapping = new PrintroveMapping({
        ducoProductId,
        printroveProductId,
        printroveProductName: printroveProduct.name,
        variants: variants.map(variant => ({
          ducoSize: variant.size || 'Unknown',
          ducoColor: variant.color || 'Default',
          printroveVariantId: variant.id,
          printroveVariantName: variant.name || `${variant.size} ${variant.color}`,
          printroveSku: variant.sku,
          printrovePrice: variant.price,
          isAvailable: true
        })),
        syncStatus: 'active',
        isActive: true
      });

      await mapping.save();

      // Update the Duco product with Printrove info
      await Product.findByIdAndUpdate(ducoProductId, {
        printroveProductId: printroveProductId,
        printroveVariantId: variants[0]?.id || null // Default to first variant
      });

      console.log(`✅ Created Printrove mapping for product ${ducoProductId}`);
      return mapping;

    } catch (error) {
      console.error('Error creating product mapping:', error.message);
      throw error;
    }
  }

  // Get mapping for a Duco product
  async getProductMapping(ducoProductId) {
    return await PrintroveMapping.findOne({ ducoProductId, isActive: true });
  }

  // Get variant ID for specific size/color
  async getVariantId(ducoProductId, size, color = null) {
    const mapping = await this.getProductMapping(ducoProductId);
    if (!mapping) {
      return null;
    }

    // Normalize size
    const normalizedSize = size.toUpperCase().trim();
    
    // Find matching variant
    const variant = mapping.variants.find(v => {
      const sizeMatch = v.ducoSize?.toUpperCase().trim() === normalizedSize;
      const colorMatch = !color || v.ducoColor?.toLowerCase().includes(color.toLowerCase());
      return sizeMatch && colorMatch && v.isAvailable;
    });

    return variant?.printroveVariantId || null;
  }

  // Get all variant mappings for a product
  async getVariantMappings(ducoProductId) {
    const mapping = await this.getProductMapping(ducoProductId);
    if (!mapping) {
      return {};
    }

    const variantMap = {};
    mapping.variants.forEach(variant => {
      if (variant.isAvailable && variant.ducoSize) {
        const normalizedSize = variant.ducoSize.toUpperCase().trim();
        variantMap[normalizedSize] = variant.printroveVariantId;
      }
    });

    return variantMap;
  }

  // Sync all products with Printrove
  async syncAllProducts() {
    try {
      console.log('🔄 Starting Printrove sync for all products...');
      
      const products = await Product.find({ printroveProductId: { $exists: true, $ne: null } });
      const results = [];

      for (const product of products) {
        try {
          const mapping = await this.getProductMapping(product._id);
          if (!mapping) {
            // Create mapping if it doesn't exist
            const result = await this.createProductMapping(product._id, product.printroveProductId);
            results.push({ productId: product._id, status: 'created', mapping: result });
          } else {
            // Update existing mapping
            mapping.lastSynced = new Date();
            await mapping.save();
            results.push({ productId: product._id, status: 'updated', mapping });
          }
        } catch (error) {
          console.error(`Error syncing product ${product._id}:`, error.message);
          results.push({ productId: product._id, status: 'error', error: error.message });
        }
      }

      console.log(`✅ Printrove sync completed. ${results.length} products processed.`);
      return results;

    } catch (error) {
      console.error('Error syncing products with Printrove:', error.message);
      throw error;
    }
  }

  // Create order in Printrove
  async createOrder(orderData) {
    try {
      // Process each product to get correct variant IDs
      const orderProducts = [];

      for (const product of orderData.products) {
        const mapping = await this.getProductMapping(product.productId || product._id);
        
        if (!mapping) {
          console.warn(`No Printrove mapping found for product ${product.productId || product._id}`);
          continue;
        }

        // Process quantities by size
        const quantities = product.quantity || {};
        
        for (const [size, qty] of Object.entries(quantities)) {
          if (qty > 0) {
            const variantId = await this.getVariantId(product.productId || product._id, size, product.color);
            
            if (variantId) {
              orderProducts.push({
                variant_id: variantId,
                quantity: qty,
                is_plain: !product.design || Object.keys(product.design || {}).length === 0
              });
            } else {
              console.warn(`No variant ID found for ${product.name} size ${size}`);
            }
          }
        }
      }

      if (orderProducts.length === 0) {
        throw new Error('No valid Printrove products found in order');
      }

      // Calculate retail price
      const retailPrice = orderData.totalPay || orderData.price || 0;

      // Create Printrove order payload
      const printroveOrder = {
        reference_number: orderData.razorpayPaymentId || orderData._id || `ORD-${Date.now()}`,
        retail_price: Math.max(retailPrice, 1),
        customer: {
          name: orderData.address?.fullName || orderData.address?.name || 'Customer',
          email: orderData.address?.email || 'customer@example.com',
          number: parseInt(orderData.address?.phone || orderData.address?.mobileNumber || '9999999999'),
          address1: `${orderData.address?.houseNumber || ''} ${orderData.address?.street || ''}`.trim(),
          address2: orderData.address?.landmark || 'N/A',
          address3: '',
          pincode: parseInt(orderData.address?.pincode || orderData.address?.postalCode || '110001'),
          state: orderData.address?.state || 'Delhi',
          city: orderData.address?.city || 'New Delhi',
          country: orderData.address?.country || 'India',
        },
        cod: false,
        order_products: orderProducts
      };

      console.log('📦 Creating Printrove order:', JSON.stringify(printroveOrder, null, 2));

      const result = await this.makeRequest('POST', '/orders', printroveOrder);
      
      console.log('✅ Printrove order created successfully:', result);
      return result;

    } catch (error) {
      console.error('Error creating Printrove order:', error.message);
      throw error;
    }
  }
}

module.exports = new PrintroveIntegrationService();