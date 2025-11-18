import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/**
 * Cloudinary Upload Component (formerly ImageKit)
 * 
 * Props:
 * - onUploadSuccess: (url) => void - Callback when upload succeeds
 * - folder: string - Cloudinary folder path (optional)
 * - maxSize: number - Max file size in MB (default: 5)
 * - accept: string - Accepted file types (default: image/*)
 * - buttonText: string - Upload button text
 * - buttonClassName: string - Custom button classes
 * - showPreview: boolean - Show image preview after upload
 */
const ImageKitUpload = ({
  onUploadSuccess,
  folder = 'products',
  maxSize = 5,
  accept = 'image/*',
  buttonText = '📤 Upload Image',
  buttonClassName = '',
  showPreview = true,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError('');
    setUploadedUrl('');
    setProgress(0);

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      setUploading(true);

      // Use server-side upload for better security
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const uploadResponse = await axios.post(
        `${API_BASE_URL}/api/imagekit/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      const imageUrl = uploadResponse.data.url;
      setUploadedUrl(imageUrl);
      
      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(imageUrl);
      }

      console.log('✅ Image uploaded successfully to Cloudinary:', imageUrl);
    } catch (err) {
      console.error('❌ Upload failed:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const defaultButtonClass = `
    px-4 py-2 rounded-lg font-medium transition-all
    ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div>
        <label className={buttonClassName || defaultButtonClass}>
          <input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            className="hidden"
          />
          {uploading ? `Uploading... ${progress}%` : buttonText}
        </label>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message with Preview */}
      {uploadedUrl && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm font-medium mb-2">
            ✅ Upload successful!
          </p>
          {showPreview && (
            <div className="space-y-2">
              <img
                src={uploadedUrl}
                alt="Uploaded"
                className="w-full max-w-xs h-32 object-cover rounded-lg border"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={uploadedUrl}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(uploadedUrl);
                    alert('URL copied to clipboard!');
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageKitUpload;
