import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LZString from 'lz-string';
import { API_BASE_URL } from '../config/api';

const OrderProcessing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing your order...');
  const [orderId, setOrderId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 10; // Maximum 10 retries (20 seconds)

  useEffect(() => {
    const processOrder = async () => {
      try {
        const { paymentId, orderData, compressed, paymentmode } = location.state || {};

        if (!paymentId || !orderData) {
          throw new Error('Missing payment or order data');
        }

        console.log('📦 Processing order with payment ID:', paymentId);

        // Decompress if needed
        let finalOrderData = orderData;
        if (compressed && typeof orderData === 'string') {
          const jsonString = LZString.decompressFromBase64(orderData);
          finalOrderData = JSON.parse(jsonString);
        }

        // Send to backend
        const API_BASE = `${API_BASE_URL}/`;
        console.log('📤 Sending order to backend:', { paymentId, paymentmode });
        
        const response = await axios.post(`${API_BASE}api/completedorder`, {
          paymentId,
          orderData: finalOrderData,
          paymentmode: paymentmode || 'online',
          compressed: false, // Already decompressed
        });

        console.log('📥 Backend response:', response.data);

        // Handle case where order is still being processed (202 status)
        if (response.status === 202 && response.data.processing) {
          if (retryCount >= MAX_RETRIES) {
            throw new Error('Order processing timeout. Please check your orders page or contact support.');
          }
          
          console.log(`⏳ Order still being processed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setMessage(`Order is being processed, please wait... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          
          // Retry after 2 seconds
          setTimeout(() => {
            processOrder();
          }, 2000);
          return;
        }

        if (response.data && response.data.success && response.data.order) {
          const order = response.data.order;
          const orderId = order._id || order.id;
          
          if (!orderId) {
            throw new Error('Order created but no ID returned');
          }
          
          // Check if this is a duplicate request (order already processed)
          if (response.data.duplicate) {
            console.log('ℹ️ Duplicate request detected - order already exists');
            setMessage('Order already processed, redirecting...');
          } else {
            setMessage('Order placed successfully!');
          }
          
          setOrderId(orderId);
          setStatus('success');

          // Store order ID for success page
          localStorage.setItem('lastOrderId', orderId);
          localStorage.setItem('lastOrderMeta', JSON.stringify({
            mode: paymentmode || 'online',
            isCorporate: order.orderType === 'B2B'
          }));

          // Redirect to success page after 1 second (faster for duplicates)
          setTimeout(() => {
            navigate(`/order-success/${orderId}`);
          }, response.data.duplicate ? 500 : 2000);
        } else {
          console.error('❌ Invalid response structure:', response.data);
          throw new Error(response.data?.message || 'Order creation failed - invalid response');
        }
      } catch (error) {
        console.error('❌ Order processing error:', error);
        
        // Handle 202 status (still processing) - retry
        if (error.response?.status === 202 && error.response?.data?.processing) {
          if (retryCount >= MAX_RETRIES) {
            setStatus('error');
            setMessage('Order processing timeout. Please check your orders page or contact support.');
            return;
          }
          
          console.log(`⏳ Order still being processed (from error), retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setMessage(`Order is being processed, please wait... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          
          setTimeout(() => {
            processOrder();
          }, 2000);
          return;
        }
        
        // Check if this is a duplicate request error (should be handled as success)
        if (error.response?.data?.duplicate || error.response?.data?.order) {
          console.log('ℹ️ Handling duplicate as success');
          const order = error.response.data.order;
          if (order && (order._id || order.id)) {
            const orderId = order._id || order.id;
            setOrderId(orderId);
            setStatus('success');
            setMessage('Order already processed, redirecting...');
            
            localStorage.setItem('lastOrderId', orderId);
            localStorage.setItem('lastOrderMeta', JSON.stringify({
              mode: paymentmode || 'online',
              isCorporate: order.orderType === 'B2B'
            }));
            
            setTimeout(() => {
              navigate(`/order-success/${orderId}`);
            }, 500);
            return;
          } else if (error.response?.data?.processing) {
            // Still processing, retry
            if (retryCount >= MAX_RETRIES) {
              setStatus('error');
              setMessage('Order processing timeout. Please check your orders page or contact support.');
              return;
            }
            
            console.log(`⏳ Order still being processed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            setMessage(`Order is being processed, please wait... (${retryCount + 1}/${MAX_RETRIES})`);
            setRetryCount(prev => prev + 1);
            
            setTimeout(() => {
              processOrder();
            }, 2000);
            return;
          }
        }
        
        setStatus('error');
        setMessage(error.response?.data?.message || error.message || 'Failed to process order. Please contact support.');
      }
    };

    processOrder();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#E5C870] mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Processing Order</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Please do not close this window...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Order Successful!</h2>
            <p className="text-gray-600">{message}</p>
            {orderId && (
              <p className="text-sm text-gray-500 mt-2">Order ID: {orderId}</p>
            )}
            <p className="text-sm text-gray-500 mt-4">Redirecting to order details...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Order Failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/cart')}
              className="bg-[#E5C870] text-black px-6 py-2 rounded-md hover:bg-[#D4B752] font-semibold"
            >
              Return to Cart
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderProcessing;
