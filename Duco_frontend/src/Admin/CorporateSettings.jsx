import React, { useState, useEffect } from 'react';

const CorporateSettings = () => {
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
    corporatePaymentMethods: ['online', 'netbanking', '50%', 'manual_payment']
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/corporate-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      } else if (response.status === 404) {
        console.log('Corporate settings API not available, using defaults');
      }
    } catch (error) {
      console.log('Corporate settings API not available, using defaults');
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/corporate-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage('✅ Corporate settings saved successfully!');
      } else if (response.status === 404) {
        setMessage('⚠️ Settings API not available. Settings will be used for this session only.');
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch (error) {
      console.log('Corporate settings API not available');
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
    setSettings(prev => ({
      ...prev,
      bulkDiscountTiers: prev.bulkDiscountTiers.map((tier, i) => 
        i === index ? { ...tier, [field]: Number(value) } : tier
      )
    }));
  };

  const removeDiscountTier = (index) => {
    setSettings(prev => ({
      ...prev,
      bulkDiscountTiers: prev.bulkDiscountTiers.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bulk order Settings</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Minimum Order Quantity */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Minimum Order Requirements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Order Quantity
              </label>
              <input
                type="number"
                value={settings.minOrderQuantity}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  minOrderQuantity: Number(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum quantity required for corporate orders
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Corporate GST Rate (%)
              </label>
              <input
                type="number"
                value={settings.corporateGstRate}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  corporateGstRate: Number(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                GST rate for corporate orders (default: 18%)
              </p>
            </div>
          </div>
        </div>

        {/* Bulk Discount Tiers */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Bulk Discount Tiers</h2>
            <button
              onClick={addDiscountTier}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Add Tier
            </button>
          </div>

          <div className="space-y-3">
            {settings.bulkDiscountTiers.map((tier, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600">Min Qty</label>
                  <input
                    type="number"
                    value={tier.minQty}
                    onChange={(e) => updateDiscountTier(index, 'minQty', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600">Max Qty</label>
                  <input
                    type="number"
                    value={tier.maxQty}
                    onChange={(e) => updateDiscountTier(index, 'maxQty', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600">Discount (%)</label>
                  <input
                    type="number"
                    value={tier.discount}
                    onChange={(e) => updateDiscountTier(index, 'discount', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <button
                  onClick={() => removeDiscountTier(index)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Settings */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Integration Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enablePrintrove"
                checked={settings.enablePrintroveIntegration}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  enablePrintroveIntegration: e.target.checked 
                }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="enablePrintrove" className="ml-2 text-sm text-gray-700">
                Enable Printrove Integration for Corporate Orders
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              When disabled, corporate orders will be processed manually without Printrove
            </p>
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
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Corporate Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorporateSettings;