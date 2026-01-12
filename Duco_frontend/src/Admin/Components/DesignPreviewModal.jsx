import React, { useState } from 'react';
import { X, Download, Eye } from 'lucide-react';

const DesignPreviewModal = ({ isOpen, onClose, designImages, additionalFiles, orderId }) => {
  const [selectedView, setSelectedView] = useState('front');
  const [showFileList, setShowFileList] = useState(false);

  if (!isOpen) return null;

  const views = ['front', 'back', 'left', 'right'];
  const currentImage = designImages?.[selectedView];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Design Preview</h2>
            <p className="text-blue-100 text-sm">Order ID: {orderId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Design Image Display */}
          {currentImage ? (
            <div className="mb-8">
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <img
                  src={currentImage}
                  alt={`${selectedView} view`}
                  className="w-full h-auto max-h-96 object-contain rounded"
                />
              </div>
              <p className="text-center text-gray-600 text-sm">
                {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} View
              </p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-12 mb-8 text-center">
              <Eye size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No design image available for {selectedView} view</p>
            </div>
          )}

          {/* View Selector */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Select View</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {views.map((view) => (
                <button
                  key={view}
                  onClick={() => setSelectedView(view)}
                  className={`py-2 px-3 rounded-lg font-medium transition ${
                    selectedView === view
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Files Section */}
          {additionalFiles && additionalFiles.length > 0 && (
            <div className="border-t pt-6">
              <button
                onClick={() => setShowFileList(!showFileList)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-blue-600 transition"
              >
                <span>📎 Additional Files ({additionalFiles.length})</span>
                <span className={`transform transition ${showFileList ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showFileList && (
                <div className="mt-4 space-y-2">
                  {additionalFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 transition"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl">
                          {file.name?.toLowerCase().endsWith('.cdr') ? '🎨' : '📄'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.type || 'File'} • {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Size unknown'}
                          </p>
                        </div>
                      </div>
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="Download file"
                        >
                          <Download size={18} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No Files Message */}
          {(!additionalFiles || additionalFiles.length === 0) && (
            <div className="border-t pt-6 text-center text-gray-500">
              <p>No additional files (CDR/PDF) uploaded for this order</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignPreviewModal;
