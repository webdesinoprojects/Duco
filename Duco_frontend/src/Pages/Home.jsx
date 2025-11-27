import React, { useEffect, useState } from 'react';
import SectionHome1 from '../Components/SectionHome1.jsx';
import SectionHome2 from '../Components/SectionHome2.jsx';
import SectionHome3 from '../Components/SectionHome3.jsx';
import TrendingHome from '../Components/TrendingHome.jsx';
import BannerHome from '../Components/BannerHome.jsx';
import axios from 'axios';
import { usePriceContext } from '../ContextAPI/PriceContext.jsx';

const continentMapping = {
  "IN": "Asia",
  "US": "North America",
  "CA": "North America",
  "GB": "Europe",
  "DE": "Europe",
  "FR": "Europe",
  "NL": "Europe", // Netherlands (Amsterdam)
  "ES": "Europe",
  "IT": "Europe",
  "AU": "Australia",
  "NZ": "Australia",
  "CN": "Asia",
  "JP": "Asia",
  "KR": "Asia",
  "SG": "Asia",
  "AE": "Asia", // UAE
  "SA": "Asia", // Saudi Arabia
};

const Home = () => {
  const { setLocation } = usePriceContext();
  const [banner, setBanner] = useState("");
  const [loading, setLoading] = useState(true);

  // List of local videos for floating carousel
  const [videoList] = useState([
    "/icons/vid1.mp4",
    "/icons/vid2.mp4",
    "/icons/vid3.mp4",
    "/icons/vid4.mp4",
  ]);

  useEffect(() => {
    console.log('Home component mounted');
    
    axios.get("https://ipapi.co/json/")
      .then((response) => {
        const data = response.data;
        const mappedLocation = continentMapping[data?.country] || data?.country_name || "Asia";
        console.log("🌍 Home detected location:", {
          countryCode: data?.country,
          countryName: data?.country_name,
          mappedTo: mappedLocation
        });
        setLocation(mappedLocation);
      })
      .catch((err) => {
        console.error("Failed to fetch location:", err);
        setLocation("Asia");
      });

    const fetchBanner = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        console.log('🎨 Fetching banner from:', `${apiUrl}/api/banners`);
        const res = await axios.get(`${apiUrl}/api/banners`);
        console.log('🎨 Banner response:', res.data);
        setBanner(res.data.banners?.[0]?.link || "");
      } catch (err) {
        console.error("Failed to fetch banner data:", err);
        setBanner("");
      } finally {
        setLoading(false);
      }
    };
    fetchBanner();
  }, [setLocation]);

  return (
    <div className='h-full bg-[#0A0A0A] w-full text-white'>
      <SectionHome1 imglink={banner} />
      <SectionHome2 />
      <BannerHome link={"https://ik.imagekit.io/vuavxn05l/5213288.jpg?updatedAt=1757162698605"} />
      <TrendingHome />
      <SectionHome3 />

      {/* Floating video carousel */}
      <div className="w-full mt-8 mb-8 px-4 overflow-hidden relative">
        <h2 className="text-lg font-medium mb-4">
          Here are our products' live reviews
        </h2>
        <div className="flex gap-6 animate-marquee">
          {videoList.concat(videoList).map((videoUrl, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-gray-800"
              style={{ width: '300px', aspectRatio: '16/9' }}
            >
              <video
                className="w-full h-full object-cover"
                src={videoUrl}
                autoPlay
                loop
                muted
                controls
                playsInline
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tailwind animation keyframes */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          gap: 24px;
          animation: marquee 20s linear infinite;
        }
        
        /* Faster animation for mobile devices */
        @media (max-width: 768px) {
          .animate-marquee {
            animation: marquee 8s linear infinite;
          }
        }
        
        /* Even faster for very small screens */
        @media (max-width: 480px) {
          .animate-marquee {
            animation: marquee 6s linear infinite;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
