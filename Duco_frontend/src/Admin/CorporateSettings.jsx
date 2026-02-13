import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const CorporateSettings = () => {
  const location = useLocation();
  const isEmployeeView = location.pathname.startsWith('/employees');
  const [settings, setSettings] = useState({
    minOrderQuantity: 100,
    bulkDiscountTiers: [
      { minQty: 100, maxQty: 499, discount: 5 },
      { minQty: 500, maxQty: 999, discount: 10 },
      { minQty: 1000, maxQty: 9999, discount: 15 },
      { minQty: 10000, maxQty: 999999, discount: 20 }
    ],
    corporateGstRate: 18,
    enablePrintroveIntegration: false,
    corporatePaymentMethods: ['online', 'netbanking', '50%', 'manual_payment'],
    estimatedDeliveryDays: 7, // ✅ Add estimated delivery days
    b2cPrintingChargePerSide: 15, // ✅ B2C printing charge per side
    b2cPfChargePerUnit: 10, // ✅ B2C P&F charge per unit
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      const response = await fetch(`${API_BASE}/api/corporate-settings`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result; // Handle both {data: ...} and direct response
        console.log('✅ Loaded corporate settings:', data);
        
        // Only update if we have valid data
        if (data && typeof data === 'object') {
          setSettings({
            minOrderQuantity: data.minOrderQuantity || 100,
            bulkDiscountTiers: data.bulkDiscountTiers || [
              { minQty: 100, maxQty: 499, discount: 5 },
              { minQty: 500, maxQty: 999, discount: 10 },
              { minQty: 1000, maxQty: 9999, discount: 15 },
              { minQty: 10000, maxQty: 999999, discount: 20 }
            ],
            corporateGstRate: data.corporateGstRate || 18,
            enablePrintroveIntegration: data.enablePrintroveIntegration || false,
            corporatePaymentMethods: data.corporatePaymentMethods || ['online', 'netbanking', '50%', 'manual_payment'],
            estimatedDeliveryDays: data.estimatedDeliveryDays || 7, // ✅ Load estimated delivery days
            b2cPrintingChargePerSide: data.b2cPrintingChargePerSide || 15, // ✅ Load B2C printing charge
            b2cPfChargePerUnit: data.b2cPfChargePerUnit || 10, // ✅ Load B2C P&F charge
          });
        }
      } else if (response.status === 404) {
        console.log('Corporate settings API not available, using defaults');
      }
    } catch (error) {
      console.error('Error loading corporate settings:', error);
      console.log('Corporate settings API not available, using defaults');
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      console.log('💾 Saving corporate settings:', settings);
      
      const response = await fetch(`${API_BASE}/api/corporate-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Settings saved successfully:', result);
        
        // Update local state with saved data to prevent reverting
        if (result.data) {
          setSettings({
            minOrderQuantity: result.data.minOrderQuantity || settings.minOrderQuantity,
            bulkDiscountTiers: result.data.bulkDiscountTiers || settings.bulkDiscountTiers,
            corporateGstRate: result.data.corporateGstRate || settings.corporateGstRate,
            enablePrintroveIntegration: result.data.enablePrintroveIntegration || settings.enablePrintroveIntegration,
            corporatePaymentMethods: result.data.corporatePaymentMethods || settings.corporatePaymentMethods,
            estimatedDeliveryDays: result.data.estimatedDeliveryDays || settings.estimatedDeliveryDays, // ✅ Save estimated delivery days
            b2cPrintingChargePerSide: result.data.b2cPrintingChargePerSide || settings.b2cPrintingChargePerSide, // ✅ Save B2C printing charge
            b2cPfChargePerUnit: result.data.b2cPfChargePerUnit || settings.b2cPfChargePerUnit, // ✅ Save B2C P&F charge
          });
        }
        
        setMessage('✅ Corporate settings saved successfully!');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else if (response.status === 404) {
        setMessage('⚠️ Settings API not available. Settings will be used for this session only.');
      } else {
        const error = await response.json();
        console.error('❌ Failed to save settings:', error);
        setMessage(`❌ Failed to save settings: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving corporate settings:', error);
      setMessage('⚠️ Settings API not available. Settings will be used for this session only.');
    } finally {
      setLoading(false);
    }
  };

  const addDiscountTier = () => {
    setSettings(prev => ({
      ...prev,
      bulkDiscountTiers: [
        ...prev.bulkDiscountTiers,
        { minQty: 0, maxQty: 0, discount: 0 }
      ]
    }));
  };

  const updateDiscountTier = (index, field, value) => {
    // Only allow digits or empty string
    if (value === '' || /^\d+$/.test(value)) {
      setSettings(prev => ({
        ...prev,
        bulkDiscountTiers: prev.bulkDiscountTiers.map((tier, i) => 
          i === index ? { ...tier, [field]: value === '' ? 0 : Number(value) } : tier
        )
      }));
    }
  };

  const removeDiscountTier = (index) => {
    setSettings(prev => ({
      ...prev,
      bulkDiscountTiers: prev.bulkDiscountTiers.filter((_, i) => i !== index)
    }));
  };

  // Calculate discount for preview
  const calculateDiscountPreview = (quantity) => {
    const tier = settings.bulkDiscountTiers.find(
      t => quantity >= t.minQty && quantity <= t.maxQty
    );
    return tier ? tier.discount : 0;
  };

  // Validate tiers before saving
  const validateTiers = () => {
    const tiers = settings.bulkDiscountTiers;
    
    // Check for empty values
    for (let i = 0; i < tiers.length; i++) {
      if (!tiers[i].minQty || !tiers[i].maxQty || tiers[i].discount === undefined) {
        setMessage(`❌ Tier ${i + 1}: All fields are required`);
        return false;
      }
      if (tiers[i].minQty >= tiers[i].maxQty) {
        setMessage(`❌ Tier ${i + 1}: Min quantity must be less than max quantity`);
        return false;
      }
    }

    // Check for gaps
    const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
    for (let i = 1; i < sortedTiers.length; i++) {
      const prevMax = sortedTiers[i - 1].maxQty;
      const currentMin = sortedTiers[i].minQty;
      if (currentMin !== prevMax + 1) {
        setMessage(`⚠️ Warning: Gap between tier ending at ${prevMax} and tier starting at ${currentMin}`);
      }
    }

    // ✅ Validate B2C charges
    if (settings.b2cPrintingChargePerSide < 0) {
      setMessage('❌ B2C printing charge must be non-negative');
      return false;
    }
    if (settings.b2cPfChargePerUnit < 0) {
      setMessage('❌ B2C P&F charge must be non-negative');
      return false;
    }
    if (!Number.isFinite(settings.b2cPrintingChargePerSide)) {
      setMessage('❌ B2C printing charge must be a valid number');
      return false;
    }
    if (!Number.isFinite(settings.b2cPfChargePerUnit)) {
      setMessage('❌ B2C P&F charge must be a valid number');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (validateTiers()) {
      saveSettings();
    }
  };

  return (
    <div className={`p-6 max-w-6xl mx-auto ${isEmployeeView ? 'text-gray-100 employee-theme' : ''}`}>
      {isEmployeeView && (
        <style>{`
          .employee-theme .text-gray-800, 
          .employee-theme .text-gray-700, 
          .employee-theme .text-gray-600, 
          .employee-theme .text-gray-500 {
            color: #e5e7eb !important;
          }
          .employee-theme .text-blue-900,
          .employee-theme .text-green-600,
          .employee-theme .text-gray-400 {
            color: #d1d5db !important;
          }
          .employee-theme .bg-white .text-gray-800,
          .employee-theme .bg-white .text-gray-700,
          .employee-theme .bg-white .text-gray-600,
          .employee-theme .bg-white .text-gray-500,
          .employee-theme .bg-white .text-blue-900,
          .employee-theme .bg-white .text-green-600,
          .employee-theme .bg-white .text-gray-400 {
            color: #111827 !important;
          }
          .employee-theme input::placeholder,
          .employee-theme textarea::placeholder {
            color: #9ca3af !important;
          }
        `}</style>
      )}
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isEmployeeView ? 'text-gray-100' : 'text-gray-800'}`}>🏢 Corporate/Bulk Order Settings</h1>
        <p className={`${isEmployeeView ? 'text-gray-300' : 'text-gray-600'}`}>Configure minimum order quantities, bulk discount tiers, and payment options for corporate customers</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
          message.includes('✅') 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.includes('⚠️')
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <span className="text-xl">
            {message.includes('✅') ? '✅' : message.includes('⚠️') ? '⚠️' : '❌'}
          </span>
          <span>{message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Minimum Order Quantity */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Minimum Order Requirements</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Order Quantity
            </label>
            <input
              type="text"
              value={settings.minOrderQuantity === 0 ? '' : settings.minOrderQuantity}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow digits or empty string
                if (value === '' || /^\d+$/.test(value)) {
                  const newValue = value === '' ? 0 : Number(value);
                  console.log('📝 Minimum Order Quantity changed to:', newValue);
                  setSettings(prev => ({ 
                    ...prev, 
                    minOrderQuantity: newValue
                  }));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter minimum quantity"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum quantity required for corporate orders
            </p>
          </div>
        </div>

        {/* Estimated Delivery Days */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">📅 Estimated Delivery Days</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Estimated Delivery Days
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={settings.estimatedDeliveryDays === 0 ? '' : settings.estimatedDeliveryDays}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow digits or empty string
                  if (value === '' || /^\d+$/.test(value)) {
                    const numValue = value === '' ? 0 : Number(value);
                    setSettings(prev => ({ 
                      ...prev, 
                      estimatedDeliveryDays: numValue
                    }));
                  }
                }}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter days"
              />
              <span className="text-sm text-gray-600">days from order creation</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This is the default estimated delivery date shown to customers when they track their orders. 
              You can override this for individual orders from the admin panel.
            </p>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Example:</strong> If set to 5 days, an order placed today will show an estimated delivery date of 5 days from now.
              </p>
            </div>
          </div>
        </div>

        {/* Bulk Discount Tiers */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                💰 Bulk Discount Tiers
              </h2>
              <p className="text-sm text-gray-600 mt-1">Define discount percentages based on order quantity</p>
            </div>
            <button
              onClick={addDiscountTier}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              ➕ Add Tier
            </button>
          </div>

          {settings.bulkDiscountTiers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No discount tiers configured</p>
              <p className="text-sm">Click "Add Tier" to create your first discount tier</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.bulkDiscountTiers.map((tier, index) => (
                <div key={index} className="flex items-end gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Quantity
                    </label>
                    <input
                      type="text"
                      value={tier.minQty === 0 ? '' : tier.minQty}
                      onChange={(e) => updateDiscountTier(index, 'minQty', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Quantity
                    </label>
                    <input
                      type="text"
                      value={tier.maxQty === 0 ? '' : tier.maxQty}
                      onChange={(e) => updateDiscountTier(index, 'maxQty', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 499"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="text"
                      value={tier.discount === 0 ? '' : tier.discount}
                      onChange={(e) => updateDiscountTier(index, 'discount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-600 text-center">Tier {index + 1}</span>
                    <button
                      onClick={() => removeDiscountTier(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                      title="Remove this tier"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Discount Preview removed as per request */}
        </div>


        {/* B2C Charges Settings */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">💳 B2C Order Charges</h2>
          <p className="text-sm text-gray-600 mb-4">Configure charges for B2C (retail) orders</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* B2C Printing Charge Per Side */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Printing Charge Per Side (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.b2cPrintingChargePerSide === 0 ? '' : settings.b2cPrintingChargePerSide}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                    const numValue = value === '' ? 0 : Math.max(0, Number(value));
                    setSettings(prev => ({ 
                      ...prev, 
                      b2cPrintingChargePerSide: numValue
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 15"
              />
              <p className="text-xs text-gray-500 mt-1">
                Charge per printed side (e.g., ₹15 per side)
              </p>
            </div>

            {/* B2C P&F Charge Per Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                P&F Charge Per Unit (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.b2cPfChargePerUnit === 0 ? '' : settings.b2cPfChargePerUnit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                    const numValue = value === '' ? 0 : Math.max(0, Number(value));
                    setSettings(prev => ({ 
                      ...prev, 
                      b2cPfChargePerUnit: numValue
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Packaging & Forwarding charge per unit (e.g., ₹10 per shirt)
              </p>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📊 Example Calculation</h3>
            <p className="text-sm text-blue-900">
              For a B2C order with 2 shirts, 1 side printed:
            </p>
            <ul className="text-sm text-blue-900 mt-2 ml-4 list-disc">
              <li>Printing: 1 side × ₹{settings.b2cPrintingChargePerSide} = ₹{settings.b2cPrintingChargePerSide}</li>
              <li>P&F: 2 units × ₹{settings.b2cPfChargePerUnit} = ₹{2 * settings.b2cPfChargePerUnit}</li>
              <li>Total Charges: ₹{settings.b2cPrintingChargePerSide + (2 * settings.b2cPfChargePerUnit)}</li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Allowed Payment Methods</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'online', label: 'Online Payment' },
              { value: 'netbanking', label: 'Net Banking' },
              { value: '50%', label: '50% Advance' },
              { value: 'manual_payment', label: 'Manual Payment' },
              { value: 'COD', label: 'Cash on Delivery' },
              { value: 'store_pickup', label: 'Store Pickup' }
            ].map(method => (
              <div key={method.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={method.value}
                  checked={settings.corporatePaymentMethods.includes(method.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSettings(prev => ({
                        ...prev,
                        corporatePaymentMethods: [...prev.corporatePaymentMethods, method.value]
                      }));
                    } else {
                      setSettings(prev => ({
                        ...prev,
                        corporatePaymentMethods: prev.corporatePaymentMethods.filter(m => m !== method.value)
                      }));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={method.value} className="ml-2 text-sm text-gray-700">
                  {method.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center">
          <button
            onClick={loadSettings}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
          >
            🔄 Reset to Saved
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                💾 Save Corporate Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorporateSettings;