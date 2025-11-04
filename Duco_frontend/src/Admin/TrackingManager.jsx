import React, { useState, useEffect } from 'react';
import { 
  bulkSyncOrderStatuses, 
  getUserOrdersWithTracking, 
  updateOrderStatus,
  getOrderTracking 
} from '../Service/trackingApi';
import { FaSync, FaEye, FaEdit, FaExternalLinkAlt, FaShippingFast } from 'react-icons/fa';

const ACCENT = "#E5C870";

const TrackingManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingDetails, setTrackingDetails] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const statusColors = {
    'Pending': 'bg-yellow-500',
    'Processing': 'bg-blue-500',
    'Shipped': 'bg-purple-500',
    'Delivered': 'bg-green-500',
    'Cancelled': 'bg-red-500'
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://duco-67o5.onrender.com/api/admin/orders?limit=100');
      const data = await response.json();
      
      // Handle both old format and new paginated format
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSync = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      const result = await bulkSyncOrderStatuses();
      console.log('Bulk sync result:', result);
      await loadOrders(); // Reload orders
      alert(`Sync completed: ${result.successful} successful, ${result.failed} failed`);
    } catch (error) {
      console.error('Bulk sync failed:', error);
      alert('Bulk sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleViewTracking = async (orderId) => {
    try {
      setSelectedOrder(orderId);
      const tracking = await getOrderTracking(orderId);
      setTrackingDetails(tracking);
    } catch (error) {
      console.error('Error fetching tracking details:', error);
      alert('Failed to fetch tracking details: ' + error.message);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingOrder || !newStatus) return;
    try {
      await updateOrderStatus(editingOrder, newStatus, statusNote);
      setEditingOrder(null);
      setNewStatus('');
      setStatusNote('');
      await loadOrders();
      alert('Order status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5C870] mx-auto mb-4"></div>
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: ACCENT }}>
              Tracking Manager
            </h1>
            <p className="text-gray-400 mt-2">
              Manage order tracking and sync with Duco Art
            </p>
          </div>
          
          <button
            onClick={handleBulkSync}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: ACCENT, 
              color: '#000',
              opacity: syncing ? 0.5 : 1
            }}
          >
            <FaSync className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Bulk Sync All'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {statusOptions.map(status => {
            const count = orders.filter(o => o.status === status).length;
            return (
              <div key={status} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{status}</p>
                    <p className="text-2xl font-bold text-white">{count}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Orders Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold">All Orders ({orders.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Duco Art
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-white">
                        {order.orderId || order._id.slice(-8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {order.address?.fullName || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.address?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                      {order.printroveStatus && order.printroveStatus !== order.status && (
                        <div className="text-xs text-gray-400 mt-1">
                          Duco Art: {order.printroveStatus}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.printroveOrderId ? (
                        <div className="text-sm">
                          <div className="text-white font-mono text-xs">
                            {order.printroveOrderId}
                          </div>
                          {order.printroveTrackingUrl && (
                            <button
                              onClick={() => window.open(order.printroveTrackingUrl, '_blank')}
                              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-1"
                            >
                              <FaExternalLinkAlt />
                              Track
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Not sent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ₹{(order.totalPay || order.price || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewTracking(order._id)}
                          className="text-blue-400 hover:text-blue-300"
                          title="View Tracking"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => {
                            setEditingOrder(order._id);
                            setNewStatus(order.status);
                          }}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="Edit Status"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Status Modal */}
        {editingOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
              <h3 className="text-lg font-semibold mb-4" style={{ color: ACCENT }}>
                Update Order Status
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Note (Optional)
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add a note about this status change..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingOrder(null);
                    setNewStatus('');
                    setStatusNote('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  className="px-4 py-2 rounded-md font-semibold transition-colors"
                  style={{ backgroundColor: ACCENT, color: '#000' }}
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Details Modal */}
        {selectedOrder && trackingDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: ACCENT }}>
                  Tracking Details
                </h3>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setTrackingDetails(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {trackingDetails.timeline && trackingDetails.timeline.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Timeline</h4>
                  {trackingDetails.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                      <div className={`w-3 h-3 rounded-full mt-1 ${event.isCompleted ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{event.status}</div>
                        <div className="text-sm text-gray-400">{event.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {trackingDetails.trackingUrl && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => window.open(trackingDetails.trackingUrl, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors"
                    style={{ backgroundColor: ACCENT, color: '#000' }}
                  >
                    <FaExternalLinkAlt />
                    Track on Duco Art
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingManager;