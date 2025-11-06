const CorporateSettings = require('../DataBase/Models/CorporateSettings');

// Get corporate settings
exports.getCorporateSettings = async (req, res) => {
  try {
    const settings = await CorporateSettings.getSingletonSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching corporate settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch corporate settings'
    });
  }
};

// Update corporate settings
exports.updateCorporateSettings = async (req, res) => {
  try {
    const {
      minOrderQuantity,
      bulkDiscountTiers,
      corporateGstRate,
      enablePrintroveIntegration,
      corporatePaymentMethods
    } = req.body;

    // Validate discount tiers
    if (bulkDiscountTiers && Array.isArray(bulkDiscountTiers)) {
      for (let i = 0; i < bulkDiscountTiers.length; i++) {
        const tier = bulkDiscountTiers[i];
        if (tier.minQty >= tier.maxQty) {
          return res.status(400).json({
            success: false,
            error: `Discount tier ${i + 1}: minQty must be less than maxQty`
          });
        }
        if (tier.discount < 0 || tier.discount > 100) {
          return res.status(400).json({
            success: false,
            error: `Discount tier ${i + 1}: discount must be between 0 and 100`
          });
        }
      }

      // Sort tiers by minQty
      bulkDiscountTiers.sort((a, b) => a.minQty - b.minQty);

      // Check for overlapping tiers
      for (let i = 1; i < bulkDiscountTiers.length; i++) {
        const prevTier = bulkDiscountTiers[i - 1];
        const currentTier = bulkDiscountTiers[i];
        if (currentTier.minQty <= prevTier.maxQty) {
          return res.status(400).json({
            success: false,
            error: `Discount tiers overlap: tier starting at ${currentTier.minQty} overlaps with previous tier ending at ${prevTier.maxQty}`
          });
        }
      }
    }

    const settings = await CorporateSettings.getSingletonSettings();
    
    // Update fields if provided
    if (minOrderQuantity !== undefined) settings.minOrderQuantity = minOrderQuantity;
    if (bulkDiscountTiers !== undefined) settings.bulkDiscountTiers = bulkDiscountTiers;
    if (corporateGstRate !== undefined) settings.corporateGstRate = corporateGstRate;
    if (enablePrintroveIntegration !== undefined) settings.enablePrintroveIntegration = enablePrintroveIntegration;
    if (corporatePaymentMethods !== undefined) settings.corporatePaymentMethods = corporatePaymentMethods;

    await settings.save();

    res.json({
      success: true,
      data: settings,
      message: 'Corporate settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating corporate settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update corporate settings'
    });
  }
};

// Get discount for a specific quantity
exports.getDiscountForQuantity = async (req, res) => {
  try {
    const { quantity } = req.query;
    const qty = parseInt(quantity);

    if (!qty || qty < 1) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      });
    }

    const settings = await CorporateSettings.getSingletonSettings();
    
    // Check if quantity meets minimum order requirement
    if (qty < settings.minOrderQuantity) {
      return res.json({
        success: true,
        data: {
          quantity: qty,
          discount: 0,
          meetsMinimum: false,
          minimumRequired: settings.minOrderQuantity,
          message: `Minimum order quantity is ${settings.minOrderQuantity}`
        }
      });
    }

    // Find applicable discount tier
    const applicableTier = settings.bulkDiscountTiers.find(
      tier => qty >= tier.minQty && qty <= tier.maxQty
    );

    const discount = applicableTier ? applicableTier.discount : 0;

    res.json({
      success: true,
      data: {
        quantity: qty,
        discount,
        meetsMinimum: true,
        minimumRequired: settings.minOrderQuantity,
        tier: applicableTier || null
      }
    });
  } catch (error) {
    console.error('Error calculating discount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate discount'
    });
  }
};