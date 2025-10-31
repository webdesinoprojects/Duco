// 📁 src/components/AddressManager.jsx
import React, { useState } from 'react';
import { addAddressToUser } from '../Service/UserAPI';

const AddressManager = ({ addresss,setAddresss,user, setUser }) => {
  const [address, setAddress] = useState({
    fullName: '',
    mobileNumber: '',
    houseNumber: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    landmark: '',
    addressType: 'Home'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddress({ ...address, [name]: value });
  };

  const handleAddAddress = async () => {
    setError('');
    const requiredFields = ['fullName', 'mobileNumber', 'houseNumber', 'street', 'city', 'state', 'pincode', 'country'];
    for (let field of requiredFields) {
      if (!address[field]) {
        setError(`Please fill the ${field}`);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await addAddressToUser({
        userId: user._id,
        address
      });

      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));

      setAddress({
        fullName: '',
        mobileNumber: '',
        houseNumber: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        landmark: '',
        addressType: 'Home'
      });
    } catch (err) {
      setError(err.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-6 border-t border-gray-700 pt-4">
      <h3 className="text-lg font-semibold mb-2 text-[#E5C870]">Saved Addresses</h3>
      {user?.address && user.address?.length > 0 ? (
        <ul className="space-y-2 text-sm">
    {user?.address?.map((addr, index) => {
      const isSelected = addresss === addr;
      return (
        <li
          onClick={() => setAddresss(addr)}
          key={index}
          className={`p-3 rounded-lg border text-white cursor-pointer transition 
            ${isSelected ? 'border-yellow-400 bg-gray-700' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
        >
          <p className="font-semibold text-white">
            {addr.fullName} ({addr.addressType})
          </p>
          <p>{addr.houseNumber}, {addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
          <p>{addr.country}{addr.landmark && `, Landmark: ${addr.landmark}`}</p>
          <p>📞 {addr.mobileNumber}</p>
        </li>
      );
    })}
  </ul>
      ) : (
        <p className="text-gray-400 text-sm">No saved addresses yet.</p>
      )}

      {/* Add Address Form */}
      <h3 className="text-lg font-semibold text-[#E5C870] mt-6 mb-2">Add New Address</h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <input name="fullName" placeholder="Full Name" value={address.fullName} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="mobileNumber" placeholder="Mobile Number" value={address.mobileNumber} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="houseNumber" placeholder="House No." value={address.houseNumber} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="street" placeholder="Street" value={address.street} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="city" placeholder="City" value={address.city} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="state" placeholder="State" value={address.state} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="pincode" placeholder="Pincode" value={address.pincode} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="landmark" placeholder="Landmark (optional)" value={address.landmark} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded" />
        <input name="country" placeholder="Country" value={address.country} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded col-span-2" />
        <select name="addressType" value={address.addressType} onChange={handleInputChange} className="p-2 bg-gray-900 border border-gray-600 text-white rounded col-span-2">
          <option>Home</option>
          <option>Office</option>
          <option>Other</option>
        </select>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <button
        onClick={handleAddAddress}
        disabled={loading}
        className="mt-4 w-full bg-[#E5C870] text-black py-2 rounded font-semibold hover:bg-yellow-400"
      >
        {loading ? 'Adding Address...' : 'Add Address'}
      </button>
    </div>
  );
};

export default AddressManager;