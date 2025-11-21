import React, { useState } from "react";

const UserCard = ({ user }) => {
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (addr) => {
    const parts = [];
    if (addr.houseNumber) parts.push(addr.houseNumber);
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.pincode) parts.push(addr.pincode);
    if (addr.country) parts.push(addr.country);
    return parts.join(', ') || 'No address details';
  };

  const displayedAddresses = showAllAddresses ? user?.address : user?.address?.slice(0, 2);

  return (
    <div className="bg-white shadow-md hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden border border-gray-200">
      {/* Header with Avatar */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shadow-lg">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.name || 'Unknown User'}</h2>
              <p className="text-blue-100 text-sm">{user?.email || 'No email'}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
              user?.isVerified 
                ? "bg-green-400 text-green-900" 
                : "bg-orange-400 text-orange-900"
            }`}
          >
            {user?.isVerified ? "✓ Verified" : "⚠ Unverified"}
          </span>
        </div>
      </div>

      {/* User Details */}
      <div className="p-6">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-500 font-medium">Email</span>
            </div>
            <p className="text-sm text-gray-900 truncate">{user?.email || 'N/A'}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-gray-500 font-medium">Addresses</span>
            </div>
            <p className="text-sm text-gray-900 font-semibold">{user?.address?.length || 0}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-500 font-medium">Joined</span>
            </div>
            <p className="text-sm text-gray-900">{formatDate(user?.createdAt)}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-xs text-gray-500 font-medium">User ID</span>
            </div>
            <p className="text-xs text-gray-900 font-mono truncate">{user?._id || 'N/A'}</p>
          </div>
        </div>

        {/* Addresses Section */}
        {user?.address && user.address.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Saved Addresses ({user.address.length})
              </h3>
            </div>
            <div className="space-y-2">
              {displayedAddresses.map((addr, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                      Address {i + 1}
                    </span>
                    {addr.fullName && (
                      <span className="text-xs font-semibold text-gray-700">{addr.fullName}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {formatAddress(addr)}
                  </p>
                  {addr.mobileNumber && (
                    <div className="mt-2 flex items-center text-xs text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {addr.mobileNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {user.address.length > 2 && (
              <button
                onClick={() => setShowAllAddresses(!showAllAddresses)}
                className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAllAddresses ? '▲ Show Less' : `▼ Show ${user.address.length - 2} More`}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 text-sm font-medium">No addresses saved</p>
            <p className="text-gray-400 text-xs mt-1">User hasn't added any delivery addresses yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Updated: {formatDate(user?.updatedAt)}
          </span>
          <span className="text-gray-400">ID: {user?._id?.slice(-8)}</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
