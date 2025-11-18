import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeliverySlipUpload = ({ logisticId, orderId, existingSlips = [], onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [slips, setSlips] = useState(existingSlips);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  useEffect(() => {
    setSlips(existingSlips);
  }, [existingSlips]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setError('');
    setSuccess('');

    // Validate max 2 files
    if (slips.length + files.length > 2) {
      setError('Maximum 2 delivery slip images allowed');
      return;
    }

    // Validate file size (4MB max)
    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 4MB limit`);
        return;
      }

      // Validate file type (JPG only)
      if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        setError(`File ${file.name} must be JPG/JPEG format`);
        return;
      }
    }

    setUploading(true);

    try {
      // Upload each file to Cloudinary using server-side upload
      const uploadedImages = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `logistics/delivery-slips/${orderId}`);

        const uploadResponse = await axios.post(
          `${API_BASE}/api/imagekit/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        uploadedImages.push({
          url: uploadResponse.data.url,
          bytes: uploadResponse.data.size,
          originalName: file.name
        });
      }

      // Step 3: Add to logistics record
      const deliverySlips = uploadedImages.map(img => ({
        URL: img.url,
        fileSize: img.bytes,
        fileName: img.originalName || 'delivery-slip.jpg'
      }));

      const addResponse = await axios.post(
        `${API_BASE}/api/logistics/${logisticId}/delivery-slip`,
        { deliverySlips }
      );

      if (addResponse.data.success) {
        setSlips(addResponse.data.logistic.deliverySlips || []);
        setSuccess(`Successfully uploaded ${files.length} image(s)`);
        if (onUploadComplete) {
          onUploadComplete(addResponse.data.logistic);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSlip = async (slipIndex, slipURL) => {
    if (!window.confirm('Are you sure you want to remove this delivery slip?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      // Step 1: Remove from logistics record
      const removeResponse = await axios.delete(
        `${API_BASE}/api/logistics/${logisticId}/delivery-slip`,
        {
          data: { slipIndex }
        }
      );

      if (removeResponse.data.success) {
        setSlips(removeResponse.data.logistic.deliverySlips || []);
        setSuccess('Delivery slip removed successfully');

        // Step 2: Delete from Cloudinary (extract public_id from URL)
        try {
          const urlParts = slipURL.split('/');
          const fileWithExt = urlParts[urlParts.length - 1];
          const publicId = `logistics/delivery-slips/${orderId}/${fileWithExt.split('.')[0]}`;
          
          await axios.delete(`${API_BASE}/api/logistics/delivery-slip/delete`, {
            data: { publicId }
          });
        } catch (cloudinaryError) {
          console.warn('Cloudinary deletion failed:', cloudinaryError);
          // Don't show error to user as the slip is already removed from DB
        }

        if (onUploadComplete) {
          onUploadComplete(removeResponse.data.logistic);
        }
      }
    } catch (err) {
      console.error('Remove error:', err);
      setError(err.response?.data?.error || 'Failed to remove delivery slip');
    }
  };

  return (
    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="font-semibold text-lg mb-3">📄 B2B Delivery Slips</h3>

      {/* Upload Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Delivery Slip Images
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg"
          multiple
          onChange={handleFileUpload}
          disabled={uploading || slips.length >= 2}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          Max 2 images, 4MB each, JPG format only. {slips.length}/2 uploaded.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm">✅ {success}</p>
        </div>
      )}

      {/* Loading */}
      {uploading && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-600 text-sm">⏳ Uploading...</p>
        </div>
      )}

      {/* Display Uploaded Slips */}
      {slips.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {slips.map((slip, idx) => (
            <div key={idx} className="relative group">
              <img
                src={slip.URL}
                alt={`Delivery Slip ${idx + 1}`}
                className="w-full h-40 object-cover rounded-lg border border-gray-300"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                <button
                  onClick={() => handleRemoveSlip(idx, slip.URL)}
                  className="opacity-0 group-hover:opacity-100 bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 transition-all"
                >
                  Remove
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                <p className="truncate">{slip.fileName || 'delivery-slip.jpg'}</p>
                <p>{(slip.fileSize / 1024).toFixed(0)} KB</p>
                <p>{new Date(slip.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {slips.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No delivery slips uploaded yet</p>
        </div>
      )}
    </div>
  );
};

export default DeliverySlipUpload;
