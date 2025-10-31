import React, { useEffect, useState } from 'react';
import BoxOfProdcuts from './BoxOfProdcuts';
import { ChevronRight } from 'lucide-react';
import { getproducts } from "../Service/APIservice";
import Loading from '../Components/Loading';
import { useNavigate } from 'react-router-dom';

const SectionHome2 = () => {
  const [products, setProdcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigator = useNavigate();

  useEffect(() => {
    const getdata = async () => {
      setLoading(true);
      const data = await getproducts();
      if (data) {
        setProdcuts(data.slice(0,8));
      } else {
        console.log("Data is not Present in Products Calling");
      }
      setLoading(false);
    };
    getdata();
  }, []);

  return (
    <section className="mt-[100px] sm:mt-10 px-4 md:px-8 lg:px-16">
      <h1 className="text-3xl text-white text-center font-semibold">Shop Now</h1>

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            {products?.map((item) => (
              <BoxOfProdcuts
                key={item._id}
                id={item._id}
                title={item.products_name}
                price={item.pricing[0]?.price_per || 0}
                desc={item.Desciptions[0]}
                image={item.image_url[0]?.url[0]}
              />
            ))}
          </div>

          {/* Button Wrapper */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => navigator("/products")}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl shadow-sm border font-semibold hover:bg-gray-100 transition"
            >
              Explore All
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default SectionHome2;
