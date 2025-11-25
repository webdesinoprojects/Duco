// 📁 src/components/AddressManagerEnhanced.jsx
import React, { useState, useEffect } from 'react';
import { addAddressToUser } from '../Service/UserAPI';

const AddressManagerEnhanced = ({ 
  billingAddress, 
  setBillingAddress, 
  shippingAddress, 
  setShippingAddress, 
  user, 
  setUser 
}) => {
  const [address, setAddress] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    houseNumber: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    landmark: '',
    addressType: 'Home'
  });
  
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' or 'new'

  // Sync shipping address with billing ONLY when checkbox state changes to true
  useEffect(() => {
    if (sameAsBilling && billingAddress) {
      setShippingAddress(billingAddress);
    }
  }, [sameAsBilling, setShippingAddress]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddress({ ...address, [name]: value });
  };

  const handleAddAddress = async () => {
    setError('');
    const requiredFields = ['fullName', 'mobileNumber', 'houseNumber', 'street', 'city', 'state', 'pincode', 'country'];
    for (let field of requiredFields) {
      if (!address[field]) {
        setError(`Please fill the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return;
      }
    }

    // Validate email if provided
    if (address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const response = await addAddressToUser({
        userId: user._id,
        address
      });

      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Reset form
      setAddress({
        fullName: '',
        mobileNumber: '',
        email: '',
        houseNumber: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        landmark: '',
        addressType: 'Home'
      });
      
      setActiveTab('saved');
      toast.success('Address added successfully!');
    } catch (err) {
      setError(err.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const selectBillingAddress = (addr) => {
    setBillingAddress(addr);
    // Only update shipping if checkbox is checked
    if (sameAsBilling) {
      setShippingAddress(addr);
    }
  };

  const selectShippingAddress = (addr) => {
    setShippingAddress(addr);
    setSameAsBilling(false);
  };

  return (
    <div className="w-full mt-6 border-t border-gray-700 pt-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            activeTab === 'saved'
              ? 'bg-[#E5C870] text-black'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Saved Addresses
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            activeTab === 'new'
              ? 'bg-[#E5C870] text-black'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Add New Address
        </button>
      </div>

      {/* Saved Addresses Tab */}
      {activeTab === 'saved' && (
        <div>
          {/* Billing Address Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-[#E5C870] flex items-center gap-2">
              <span>📋</span> Billing Address
            </h3>
            {user?.address && user.address?.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {user.address.map((addr, index) => {
                  const isSelected = billingAddress === addr;
                  return (
                    <li
                      onClick={() => selectBillingAddress(addr)}
                      key={`billing-${index}`}
                      className={`p-3 rounded-lg border text-white cursor-pointer transition 
                        ${isSelected ? 'border-yellow-400 bg-gray-700 ring-2 ring-yellow-400' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-white flex items-center gap-2">
                            {addr.fullName} 
                            <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                              {addr.addressType}
                            </span>
                          </p>
                          <p className="text-gray-300 mt-1">
                            {addr.houseNumber}, {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-gray-400">{addr.country}{addr.landmark && `, Landmark: ${addr.landmark}`}</p>
                          <p className="text-gray-400 mt-1">📞 {addr.mobileNumber}</p>
                          {addr.email && <p className="text-gray-400">✉️ {addr.email}</p>}
                        </div>
                        {isSelected && (
                          <span className="text-yellow-400 text-xl">✓</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm bg-gray-800 p-4 rounded-lg">
                No saved addresses yet. Add a new address to continue.
              </p>
            )}
          </div>

          {/* Same as Billing Checkbox */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="w-5 h-5 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
              />
              <span className="text-white font-medium">
                Shipping address is same as billing address
              </span>
            </label>
          </div>

          {/* Shipping Address Section (only show if different) */}
          {!sameAsBilling && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-[#E5C870] flex items-center gap-2">
                <span>📦</span> Shipping Address
              </h3>
              {user?.address && user.address?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {user.address.map((addr, index) => {
                    const isSelected = shippingAddress === addr;
                    return (
                      <li
                        onClick={() => selectShippingAddress(addr)}
                        key={`shipping-${index}`}
                        className={`p-3 rounded-lg border text-white cursor-pointer transition 
                          ${isSelected ? 'border-green-400 bg-gray-700 ring-2 ring-green-400' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-white flex items-center gap-2">
                              {addr.fullName} 
                              <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                                {addr.addressType}
                              </span>
                            </p>
                            <p className="text-gray-300 mt-1">
                              {addr.houseNumber}, {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                            <p className="text-gray-400">{addr.country}{addr.landmark && `, Landmark: ${addr.landmark}`}</p>
                            <p className="text-gray-400 mt-1">📞 {addr.mobileNumber}</p>
                            {addr.email && <p className="text-gray-400">✉️ {addr.email}</p>}
                          </div>
                          {isSelected && (
                            <span className="text-green-400 text-xl">✓</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm bg-gray-800 p-4 rounded-lg">
                  No saved addresses yet. Add a new address to continue.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add New Address Tab */}
      {activeTab === 'new' && (
        <div>
          <h3 className="text-lg font-semibold text-[#E5C870] mb-4">Add New Address</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <input 
              name="fullName" 
              placeholder="Full Name *" 
              value={address.fullName} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="mobileNumber" 
              placeholder="Mobile Number *" 
              value={address.mobileNumber} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="email" 
              type="email"
              placeholder="Email Address (optional)" 
              value={address.email} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition md:col-span-2" 
            />
            <input 
              name="houseNumber" 
              placeholder="House/Flat No. *" 
              value={address.houseNumber} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="street" 
              placeholder="Street/Area *" 
              value={address.street} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="city" 
              placeholder="City *" 
              value={address.city} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="state" 
              placeholder="State *" 
              value={address.state} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="pincode" 
              placeholder="Pincode *" 
              value={address.pincode} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="landmark" 
              placeholder="Landmark (optional)" 
              value={address.landmark} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition" 
            />
            <input 
              name="country" 
              placeholder="Country *" 
              value={address.country} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition md:col-span-2" 
            />
            <select 
              name="addressType" 
              value={address.addressType} 
              onChange={handleInputChange} 
              className="p-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:outline-none transition md:col-span-2"
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
            </div>
          )}

          <button
            onClick={handleAddAddress}
            disabled={loading}
            className="mt-4 w-full bg-[#E5C870] text-black py-3 rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Adding Address...' : '+ Add Address'}
          </button>

          <p className="text-gray-400 text-xs mt-2 text-center">
            * Required fields
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressManagerEnhanced;
