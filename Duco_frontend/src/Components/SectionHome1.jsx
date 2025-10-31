import React from 'react'
import heroImg from '../assets/20250624_0035_Vibrant Court Relaxation_remix_01jyf2tnt9es2vn3cs02bzdyzz.png'; // Adjust the path as necessary
import firstImg from "../assets/gloomy-young-black-model-clean-white-unlabeled-cotton-t-shirt-removebg-preview.png"
import secondImg from "../assets/pleased-young-handsome-guy-wearing-black-t-shirt-points-up-putting-hand-hip-isolated-white-wall-removebg-preview.png"
import { Link } from 'react-router-dom';
import Loading from '../Components/LoadingMain';


const SectionHome1 = ({imglink}) => {

  return (
    <>
 <section className="relative mt-8 px-4 md:px-8 font-sans">
  <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row gap-3">

    {/* Left big image */}
    <Link to={"/women"} className="relative w-full md:w-[70%] rounded-2xl overflow-hidden max-h-[600px] min-h-[400px] bg-gray-800">
      {!imglink ? (
        <div className="w-full h-full flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      ) : (
        <>
          <img
            src={imglink}
            alt="Main Visual"
            className="w-full h-full object-cover rounded-2xl"
          />
          
          {/* Text Overlay */}
          <div className="absolute top-8 left-6 z-10 text-white">
            <p className="text-4xl md:text-6xl font-semibold leading-tight md:leading-[3.2rem]">
              Color Of <br /> Summer <br /> Outfit
            </p>
            <button className="mt-4 px-6 py-2 bg-[#E5C870] text-black rounded-full shadow-lg text-sm md:text-base">
              Shop the Look →
            </button>
          </div>

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/30 z-0 rounded-2xl" />
        </>
      )}
    </Link>

    {/* Right stacked cards */}
    <div className="flex sm:flex-col  flex-row sm:gap-3 gap-2 w-full md:w-[30%]">
      {/* Card 1 */}
      <Link to={"/men"} className="bg-[#3a3a3a] text-[#E5C870] sm:p-6 px-2  rounded-2xl relative sm:w-full w-[40%]  h-[240px] sm:h-[260px]">
        <p className="text-2xl sm:text-5xl font-semibold sm:leading-10  leading-6 mt-[40px] z-10 relative">
          Naturally<br />Styled
        </p>
        <img
          src={secondImg}
          alt="Styled Model"
          className="object-contain absolute bottom-0 right-4 sm:w-[140px] w-[100px]"
        />
      </Link>

      {/* Card 2 */}
      <Link to={"/men"} className="bg-[#e2c565] text-black sm:p-6 px-2 rounded-2xl relative h-[240px] w-[60%] sm:w-full sm:h-[325px] overflow-hidden">
        <h2 className="text-3xl sm:text-5xl font-semibold leading-10 mt-[40px] z-10 relative">
          Casual <br /> Comfort
        </h2>
        <img
          src={firstImg}
          alt="Casual Comfort"
          className="absolute bottom-0 right-4 sm:w-[140px] w-[100px]  object-contain"
        />
      </Link>
    </div>
  </div>

  {/* Scroll Down Button */}
  <div className=" absolute md:bottom-[-36px] sm:right-12  right-4 mt-2 md:transform md:-translate-x-1/2 flex justify-center">
    <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-black font-semibold text-sm shadow hover:shadow-md transition duration-300">
      Scroll Down
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.187l3.71-3.96a.75.75 0 111.08 1.04l-4.25 4.54a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  </div>
</section>





</>
  )
}

export default SectionHome1