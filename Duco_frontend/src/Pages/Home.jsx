import React, { useEffect, useState } from 'react';
import SectionHome1 from '../Components/SectionHome1.jsx';
import SectionHome2 from '../Components/SectionHome2.jsx';
import SectionHome3 from '../Components/SectionHome3.jsx';
import TrendingHome from '../Components/TrendingHome.jsx';
import BannerHome from '../Components/BannerHome.jsx';
import axios from 'axios';
import { usePriceContext } from '../ContextAPI/PriceContext.jsx';

const countryToLocationMap = {
  "IN": "India",
  "US": "United States",
  "CA": "Canada",
  "GB": "United Kingdom",
  "DE": "Germany",
  "FR": "France",
  "NL": "Netherlands",
  "ES": "Spain",
  "IT": "Italy",
  "AU": "Australia",
  "NZ": "New Zealand",
  "CN": "China",
  "JP": "Japan",
  "KR": "South Korea",
  "SG": "Singapore",
  "AE": "UAE",
  "SA": "Saudi Arabia",
};

const Home = () => {
  const { setLocation } = usePriceContext();
  const [banner, setBanner] = useState("");
  const [heroData, setHeroData] = useState({
    text: "Color Of Summer Outfit",
    buttonText: "Shop the Look →",
    buttonLink: "/women"
  });
  const [loading, setLoading] = useState(true);
  const [allBanners, setAllBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [landingPageData, setLandingPageData] = useState(null);

  // List of local videos for floating carousel
  const [videoList, setVideoList] = useState([
    "/icons/vid1.mp4",
    "/icons/vid2.mp4",
    "/icons/vid3.mp4",
    "/icons/vid4.mp4",
  ]);

  // Function to get random banner
  const getRandomBanner = (banners) => {
    if (!banners || banners.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * banners.length);
    return banners[randomIndex];
  };

  // Function to update banner display with animation
  const updateBannerDisplay = (bannerToDisplay) => {
    // Start fade out animation
    setIsAnimating(true);
    
    // Wait for fade out, then update content
    setTimeout(() => {
      if (bannerToDisplay?.link) {
        setBanner(bannerToDisplay.link);
        console.log('🎨 Hero banner set:', bannerToDisplay.link);
      }
      
      if (bannerToDisplay?.heroText) {
        setHeroData({
          text: bannerToDisplay.heroText,
          buttonText: bannerToDisplay.buttonText || "Shop the Look →",
          buttonLink: bannerToDisplay.buttonLink || "/women"
        });
        console.log('🎨 Hero data updated:', bannerToDisplay);
      }
      
      // Start fade in animation
      setIsAnimating(false);
    }, 500); // Half second for fade out
  };

  useEffect(() => {
    console.log('Home component mounted');
    
    axios.get("https://ipapi.co/json/")
      .then((response) => {
        const data = response.data;
        const mappedLocation = countryToLocationMap[data?.country] || data?.country_name || "India";
        console.log("🌍 Home detected location:", {
          countryCode: data?.country,
          countryName: data?.country_name,
          mappedTo: mappedLocation
        });
        setLocation(mappedLocation);
      })
      .catch((err) => {
        console.error("Failed to fetch location:", err);
        setLocation("India");
      });

    const fetchBanner = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        
        // ✅ Fetch landing page data
        console.log('🎨 Fetching landing page data from:', `${apiUrl}/api/landing-page`);
        const landingRes = await axios.get(`${apiUrl}/api/landing-page`);
        if (landingRes.data.success) {
          setLandingPageData(landingRes.data.data);
          console.log('✅ Landing page data loaded:', landingRes.data.data);
          
          // Use hero section from landing page data
          if (landingRes.data.data.heroSection) {
            const heroSection = landingRes.data.data.heroSection;
            if (heroSection.mainImage) {
              setBanner(heroSection.mainImage);
            }
            setHeroData({
              text: heroSection.heroText || "Color Of Summer Outfit",
              buttonText: heroSection.buttonText || "Shop the Look →",
              buttonLink: heroSection.buttonLink || "/women"
            });
          }
          
          // Use videos from landing page data
          if (landingRes.data.data.videoCarousel?.videos) {
            setVideoList(landingRes.data.data.videoCarousel.videos);
          }
        }
        
        // ✅ Also fetch banners for rotation
        console.log('🎨 Fetching banners from:', `${apiUrl}/api/banners`);
        const res = await axios.get(`${apiUrl}/api/banners`);
        console.log('🎨 Banner response:', res.data);
        
        const banners = res.data.banners || [];
        setAllBanners(banners);
        
        if (banners.length > 0) {
          // Get random banner for initial display
          const randomBanner = getRandomBanner(banners);
          updateBannerDisplay(randomBanner);
          console.log(`🎨 Displaying random banner (${banners.length} total)`);
        }
      } catch (err) {
        console.error("Failed to fetch banner data:", err);
        setBanner("");
      } finally {
        setLoading(false);
      }
    };
    fetchBanner();
  }, [setLocation]);

  // Auto-rotate banners every 4-5 seconds with animation
  useEffect(() => {
    if (allBanners.length === 0) return;

    const interval = setInterval(() => {
      const randomBanner = getRandomBanner(allBanners);
      updateBannerDisplay(randomBanner);
      console.log('🎨 Auto-rotating to random banner');
    }, 4500); // Change banner every 4.5 seconds (includes animation time)

    return () => clearInterval(interval);
  }, [allBanners]);

  return (
    <div className='h-full bg-[#0A0A0A] w-full text-white'>
      <SectionHome1 
        imglink={banner}
        heroText={heroData.text}
        buttonText={heroData.buttonText}
        buttonLink={heroData.buttonLink}
        isAnimating={isAnimating}
        sideCards={landingPageData?.sideCards}
      />
      <SectionHome2 />
      <BannerHome link={landingPageData?.middleBanner?.image || "https://ik.imagekit.io/vuavxn05l/5213288.jpg?updatedAt=1757162698605"} />
      <TrendingHome />
      <SectionHome3 promoCards={landingPageData?.promoCards} />

      {/* Floating video carousel */}
      <div className="w-full mt-8 mb-8 px-4 overflow-hidden relative">
        <h2 className="text-lg font-medium mb-4">
          Here are our products' live reviews
        </h2>
        <div className="flex gap-6 animate-marquee">
          {videoList.concat(videoList).map((videoUrl, idx) => {
            // ✅ Extract YouTube video ID from various YouTube URL formats
            const getYouTubeId = (url) => {
              if (!url) return null;
              const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
                /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
              ];
              for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
              }
              return null;
            };
            
            const youtubeId = getYouTubeId(videoUrl);
            const isYouTube = youtubeId !== null;
            
            return (
              <div
                key={idx}
                className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-gray-800"
                style={{ width: '300px', aspectRatio: '16/9' }}
              >
                {isYouTube ? (
                  // ✅ YouTube iframe
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}`}
                    title={`Video ${idx + 1}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  // ✅ Local or external video file
                  <video
                    className="w-full h-full object-cover"
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    controls
                    playsInline
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tailwind animation keyframes */}
      <style>{`
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
