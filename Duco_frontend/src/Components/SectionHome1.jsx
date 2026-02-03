import React, { useState, useEffect } from 'react'
import heroImg from '../assets/20250624_0035_Vibrant Court Relaxation_remix_01jyf2tnt9es2vn3cs02bzdyzz.png'; // Adjust the path as necessary
import firstImg from "../assets/gloomy-young-black-model-clean-white-unlabeled-cotton-t-shirt-removebg-preview.png"
import secondImg from "../assets/pleased-young-handsome-guy-wearing-black-t-shirt-points-up-putting-hand-hip-isolated-white-wall-removebg-preview.png"
import { Link } from 'react-router-dom';


const SectionHome1 = ({imglink, heroText = "Color Of Summer Outfit", buttonText = "Shop the Look →", buttonLink = "/women", isAnimating = false, sideCards = null}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Reset image loaded state when imglink changes
    setImageLoaded(false);
  }, [imglink]);

  return (
    <>
 <section className="relative mt-8 px-4 md:px-8 font-sans">
  <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row gap-3">

    {/* Left big image */}
    <Link to={buttonLink} className={`relative w-full md:w-[70%] rounded-2xl overflow-hidden max-h-[600px] min-h-[400px] bg-gray-800 transition-opacity duration-500 ${isAnimating ? 'opacity-30' : 'opacity-100'}`}>
      <img
        src={imglink || heroImg}
        alt="Main Visual"
        className="w-full h-full object-cover rounded-2xl"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
      />
      
      {/* Text Overlay */}
      <div className={`absolute top-8 left-6 z-10 text-white transition-opacity duration-500 ${isAnimating ? 'opacity-30' : 'opacity-100'}`}>
        <p className="text-4xl md:text-6xl font-semibold leading-tight md:leading-[3.2rem]">
          {heroText.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < heroText.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
        <button className="mt-4 px-6 py-2 bg-[#E5C870] text-black rounded-full shadow-lg text-sm md:text-base hover:bg-[#d4b860] transition-colors">
          {buttonText}
        </button>
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/30 z-0 rounded-2xl" />
    </Link>

    {/* Right stacked cards */}
    <div className="flex sm:flex-col  flex-row sm:gap-3 gap-2 w-full md:w-[30%]">
      {/* Card 1 */}
      <Link to={sideCards?.card1?.link || "/men"} className="sm:p-6 px-2  rounded-2xl relative sm:w-full w-[40%]  h-[240px] sm:h-[260px]" style={{backgroundColor: sideCards?.card1?.bgColor || "#3a3a3a", color: sideCards?.card1?.textColor || "#E5C870"}}>
        <p className="text-2xl sm:text-5xl font-semibold sm:leading-10  leading-6 mt-[40px] z-10 relative">
          {sideCards?.card1?.title ? sideCards.card1.title.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < sideCards.card1.title.split('\n').length - 1 && <br />}
            </React.Fragment>
          )) : <>Naturally<br />Styled</>}
        </p>
        <img
          src={sideCards?.card1?.image || secondImg}
          alt="Styled Model"
          className="object-contain absolute bottom-0 right-4 sm:w-[140px] w-[100px]"
        />
      </Link>

      {/* Card 2 */}
      <Link to={sideCards?.card2?.link || "/men"} className="sm:p-6 px-2 rounded-2xl relative h-[240px] w-[60%] sm:w-full sm:h-[325px] overflow-hidden" style={{backgroundColor: sideCards?.card2?.bgColor || "#e2c565", color: sideCards?.card2?.textColor || "#000000"}}>
        <h2 className="text-3xl sm:text-5xl font-semibold leading-10 mt-[40px] z-10 relative">
          {sideCards?.card2?.title ? sideCards.card2.title.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < sideCards.card2.title.split('\n').length - 1 && <br />}
            </React.Fragment>
          )) : <>Casual <br /> Comfort</>}
        </h2>
        <img
          src={sideCards?.card2?.image || firstImg}
          alt="Casual Comfort"
          className="absolute bottom-0 right-4 sm:w-[140px] w-[100px]  object-contain"
        />
      </Link>
    </div>
  </div>


</section>





</>
  )
}

export default SectionHome1