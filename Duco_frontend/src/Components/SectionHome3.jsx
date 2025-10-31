import React from 'react'
import { Infinity, Hash, Circle } from "lucide-react"; 
import couple from "../assets/portrait-young-couple-yellow-removebg-preview.png"
import bulk from "../assets/confident-young-pretty-caucasian-girl-sun-glasses-holding-looking-beach-hat-isolated-orange-wall-with-copy-space-removebg-preview.png"
import sale from "../assets/happy-beautiful-couple-posing-with-shopping-bags-violet-removebg-preview.png"


const SectionHome3 = () => {
  return (
     <div className='mt-[100px] px-4 md:px-8 lg:px-16 w-full flex justify-center items-center'>

  <div className='flex flex-col md:flex-row w-full max-w-screen-xl gap-3'>

    {/* LEFT COLUMN */}
    <div className='flex flex-col w-full md:w-[75%] gap-3'>

      {/* Top Box */}
      <div className='bg-white rounded-xl  flex flex-col sm:flex-row items-center justify-between h-full shadow-sm relative'>

        {/* Text */}
        <div className="flex flex-col px-6 justify-center  sm:mr-0 mr-[135px]  text-left  ">
          <p className="text-5xl sm:text-5xl font-bold">SALE</p>
          <p className="text-5xl sm:text-5xl font-semibold">20% OFF</p>
        </div>

        {/* Image */}
        <img src={sale} alt="Sale" className='h-[155px] sm:h-[200px] md:h-[200px] object-contain' />

        {/* Badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-[#E5C870] w-10 h-10 rounded-full flex items-center justify-center">
            <span className="text-black  text-2xl font-semibold">#</span>
          </div>
        </div>

      </div>

      {/* Bottom Box */}
      <div className='bg-white rounded-xl  flex flex-col sm:flex-row items-center justify-between h-full shadow-sm relative'>

        {/* Text */}
        <div className="flex flex-col text-left px-4   sm:mr-0 mr-[160px] sm:text-left">
          <p className="text-5xl sm:text-6xl font-bold leading-tight">Get</p>
          <p className="text-5xl sm:text-6xl font-bold leading-tight">BULK</p>
          <p className="text-5xl sm:text-6xl font-bold leading-tight">T-SHIRT</p>
        </div>

        {/* Image */}
        <img src={bulk} alt="Bulk T-shirt" className='h-[200px] sm:h-[300px] object-contain mt-[50px] sm:mt-0  ' />

        {/* Badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-[#E5C870] w-10 h-10 rounded-full flex items-center justify-center">
            <span className="text-black text-2xl font-semibold">∞</span>
          </div>
        </div>

      </div>

    </div>

    {/* RIGHT COLUMN */}
    <div className='w-full md:w-[25%] bg-white rounded-xl  shadow-sm flex flex-col justify-between relative'>

      {/* Text */}
      <div className='w-full  p-4'>
        <div className='flex justify-between items-center'>
          <p className="text-5xl sm:text-5xl font-semibold">Get</p>
          <div className="bg-[#E5C870] w-10 h-10 rounded-full flex items-center justify-center">
            <span className="text-black text-2xl font-semibold">1</span>
          </div>
        </div>
        <p className="text-5xl sm:text-4xl font-semibold mt-1">Single T-shirt</p>
      </div>

      {/* Image */}
      <div className='flex justify-center mt-6'>
        <img src={couple} alt="Single T-shirt" className='h-[250px] sm:h-[300px] object-contain' />
      </div>

    </div>

  </div>
</div>



  )
}

export default SectionHome3