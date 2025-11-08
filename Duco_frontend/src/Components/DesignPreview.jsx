import React from 'react';
import { useNavigate } from 'react-router-dom';

const DesignPreviewModal = ({id,selectedDesign, onClose ,addtocart ,size , color ,colortext,price,gender, minOrderQty = 100 }) => {
  if (!selectedDesign) return null;
  console.log(colortext)

  console.log(price)
 const navigator = useNavigate()
 
 // Calculate total quantity
 const getTotalQty = () => {
   return Object.values(size || {}).reduce((sum, q) => sum + Number(q || 0), 0);
 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-2xl mx-auto text-center overflow-y-auto max-h-[90vh]">

        <div className='flex items-center mb-6  justify-between'>
                   <h2 className="text-xl font-bold ">Design Preview</h2>
         <button
          onClick={onClose}
          className=" bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close Preview
        </button>
        </div>
       

        {/* Preview container */}
     
          {/* T-shirt Base (optional background) */}
         

          {/* Display each design element in clean stacked layout */}
          <div className="w-full flex flex-col items-center gap-4 ">
            {selectedDesign.design.map((item, index) => (
              <div key={index} className="text-center">
                
                  <>
                   
                    <img
                      src={item.url}
                      alt="Uploaded"
                      className="mx-auto rounded-md shadow-md max-w-[400px]"
                      aria-placeholder='Design Image'
                    />
                    <span className='text-sm font-black'>{item.view}</span>                  </>
               
              </div>
            ))}
          </div>
     

        <button
          onClick={onClose}
          className="mt-6 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close Preview
        </button>
         <button

          onClick={()=>{ 
           addtocart({
  id,
  design: selectedDesign.design,
  color,
  quantity: size,
  colortext,
  price: price,
  gender,
  isBulkProduct: true, // Flag to identify bulk order items
  isCorporate: true, // Bulk items are corporate by default
  category: 'Corporate T-Shirt', // Include category

});

                onClose();
                navigator("/cart")
          } }

          className="mt-6  ml-10 bg-green-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
            Confirm Design
        </button>
      </div>
    </div>
  );
};

export default DesignPreviewModal;
