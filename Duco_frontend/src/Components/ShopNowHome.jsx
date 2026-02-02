import React, { useEffect, useState } from 'react';
import BoxOfProdcuts from './BoxOfProdcuts';
import { ChevronRight } from 'lucide-react';
import { getproducts } from "../Service/APIservice";
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const ShopNowHome = () => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const getData = async () => {
      const data = await getproducts();
      if (data) {
        // Show different products than trending (skip first 8, show next 8)
        setProducts(data.slice(8, 16));
      } else {
        console.log("Data is not Present in Products Calling");
      }
    };
    getData();
  }, []);

  return (
    <section className="mt-[80px] sm:mt-10 px-4 md:px-8 lg:px-16">
      <div className="flex justify-center items-center gap-2 mb-3">
        <h1 className="text-2xl text-white font-semibold">
          Shop Now
        </h1>
        <ShoppingBag className="text-[#E5C870]" size={28} />
      </div>
      
      <p className="text-center text-gray-400 text-sm mb-8">
        Discover our latest collection of premium quality apparel
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mt-8 min-h-[300px]">
        {products.map((item) => (
          <BoxOfProdcuts
            key={item._id}
            id={item._id}
            title={item.products_name}
            price={item.pricing[0]?.price_per || 0}
            description={item.Desciptions?.[0]}
            image={item.image_url?.[0]?.url?.[0]}
            stock={item.Stock || 0}
          />
        ))}
      </div>

      {products.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-2 px-4 py-2 bg-[#E5C870] text-black rounded-xl shadow-sm border font-semibold hover:bg-[#d4b760] transition"
          >
            View All Products
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
};

export default ShopNowHome;
