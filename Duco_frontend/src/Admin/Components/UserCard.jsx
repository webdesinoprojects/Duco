import React from "react";

const  UserCard = ({ user }) => {
  return (
    <div className="max-w-lg mx-auto bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
      {/* User Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
        <span
          className={`px-3 py-1 text-xs rounded-full ${
            user?.isVerified ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {user?.isVerified ? "Verified" : "Not Verified"}
        </span>
      </div>

      {/* Basic Info */}
      <div className="space-y-2 text-sm text-gray-700">
        <p><span className="font-semibold">Email:</span> {user?.email}</p>
        <p><span className="font-semibold">User ID:</span> {user?._id}</p>
        <p><span className="font-semibold">Created At:</span> {new Date(user?.createdAt).toLocaleString()}</p>
        <p><span className="font-semibold">Updated At:</span> {new Date(user?.updatedAt).toLocaleString()}</p>
      </div>

      {/* Address List */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Addresses</h3>
        {user?.address && user.address.length > 0 ? (
          <ul className="space-y-2">
            {user.address.map((addr, i) => (
              <li
                key={i}
                className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm text-gray-800"
              >
                <span className="font-medium">Address {i + 1}:</span>{" "}
                {Object.entries(addr).map(([key, value]) => (
                  <div key={key}>
                    <span className="capitalize font-semibold">{key}:</span> {value}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No addresses found</p>
        )}
      </div>
    </div>
  );
};


export default UserCard;
