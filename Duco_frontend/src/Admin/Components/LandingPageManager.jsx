import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ImageKitUpload from "../../Components/ImageKitUpload";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';

export default function LandingPageManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [landingData, setLandingData] = useState({
    // Hero Section (SectionHome1)
    heroSection: {
      mainImage: "",
      heroText: "Color Of Summer Outfit",
      buttonText: "Shop the Look →",
      buttonLink: "/women",
    },
    // Side Cards (SectionHome1)
    sideCards: {
      card1: {
        title: "Naturally\nStyled",
        image: "",
        link: "/men",
        bgColor: "#3a3a3a",
        textColor: "#E5C870",
      },
      card2: {
        title: "Casual\nComfort",
        image: "",
        link: "/men",
        bgColor: "#e2c565",
        textColor: "#000000",
      },
      card3: {
        title: "Get\nSingle T-shirt",
        image: "",
        link: "/products",
        bgColor: "#ffffff",
        textColor: "#000000",
      },
    },
    // Middle Banner (BannerHome)
    middleBanner: {
      image: "https://ik.imagekit.io/vuavxn05l/5213288.jpg?updatedAt=1757162698605",
    },
    // Promo Cards (SectionHome3)
    promoCards: {
      sale: {
        title: "SALE\n20% OFF",
        image: "",
        link: "/products",
        bgColor: "#ffffff",
      },
      bulk: {
        title: "Get\nBULK\nT-SHIRT",
        image: "",
        link: "/bulk",
        bgColor: "#ffffff",
      },
    },
    // Video Carousel
    videoCarousel: {
      videos: [
        "/icons/vid1.mp4",
        "/icons/vid2.mp4",
        "/icons/vid3.mp4",
        "/icons/vid4.mp4",
      ],
    },
  });

  // Fetch landing page data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching landing page data from:', `${API_BASE}/api/landing-page`);
        const res = await axios.get(`${API_BASE}/api/landing-page`);
        if (res.data.success) {
          setLandingData(res.data.data);
          console.log('✅ Landing page data loaded successfully');
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch landing page data, using defaults:", err.message);
        console.log("📝 Note: Backend may not have the landing page routes deployed yet");
        console.log("💡 For local development: Restart backend with 'npm start'");
        console.log("💡 For production: Deploy backend with new routes");
        // Data will use defaults from state initialization
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Save landing page data
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.post(`${API_BASE}/api/landing-page`, landingData);
      if (res.data.success) {
        toast.success("✅ Landing page updated successfully!");
      } else {
        toast.error("❌ Failed to save landing page");
      }
    } catch (err) {
      toast.error("❌ Error saving landing page: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path, value) => {
    setLandingData((prev) => {
      const keys = path.split(".");
      const newData = JSON.parse(JSON.stringify(prev));
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-[92%] max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Landing Page Manager</h1>
          <p className="text-slate-600 mt-2">Customize all banners and images on your landing page</p>
        </div>

        {/* Save Button */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "💾 Save All Changes"}
          </button>
        </div>

        {/* Hero Section */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🎨 Hero Section (Main Banner)</h2>
          
          {/* Ratio Info */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">📐 Recommended Ratio: <strong>16:9</strong> (1920x1080px or larger)</p>
            <p className="text-xs text-amber-700 mt-1">💡 This is the main hero banner displayed at the top of the landing page</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Main Image URL</label>
              <input
                type="text"
                value={landingData.heroSection.mainImage}
                onChange={(e) => updateField("heroSection.mainImage", e.target.value)}
                placeholder="https://... (16:9 ratio)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ImageKitUpload
                onUploadSuccess={(url) => updateField("heroSection.mainImage", url)}
                folder="landing-page/hero"
                buttonText="📤 Upload Hero Image"
                buttonClassName="mt-2 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                showPreview={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hero Text</label>
                <textarea
                  value={landingData.heroSection.heroText}
                  onChange={(e) => updateField("heroSection.heroText", e.target.value)}
                  placeholder="Color Of Summer Outfit"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Button Text</label>
                <input
                  type="text"
                  value={landingData.heroSection.buttonText}
                  onChange={(e) => updateField("heroSection.buttonText", e.target.value)}
                  placeholder="Shop the Look →"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Button Link</label>
                <input
                  type="text"
                  value={landingData.heroSection.buttonLink}
                  onChange={(e) => updateField("heroSection.buttonLink", e.target.value)}
                  placeholder="/women"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side Cards */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">📦 Side Cards (Hero Section)</h2>
          
          {/* Ratio Info */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">📐 Recommended Ratio: <strong>1:1</strong> (Square - 500x500px or larger)</p>
            <p className="text-xs text-amber-700 mt-1">💡 These are 3 side cards displayed next to the hero banner</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Card 1</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                  <textarea
                    value={landingData.sideCards.card1.title}
                    onChange={(e) => updateField("sideCards.card1.title", e.target.value)}
                    placeholder="Naturally\nStyled"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image</label>
                  <input
                    type="text"
                    value={landingData.sideCards.card1.image}
                    onChange={(e) => updateField("sideCards.card1.image", e.target.value)}
                    placeholder="https://... (1:1 ratio)"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ImageKitUpload
                    onUploadSuccess={(url) => updateField("sideCards.card1.image", url)}
                    folder="landing-page/cards"
                    buttonText="📤 Upload"
                    buttonClassName="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                    showPreview={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link</label>
                  <input
                    type="text"
                    value={landingData.sideCards.card1.link}
                    onChange={(e) => updateField("sideCards.card1.link", e.target.value)}
                    placeholder="/men"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">BG Color</label>
                    <input
                      type="color"
                      value={landingData.sideCards.card1.bgColor}
                      onChange={(e) => updateField("sideCards.card1.bgColor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 h-8 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Text Color</label>
                    <input
                      type="color"
                      value={landingData.sideCards.card1.textColor}
                      onChange={(e) => updateField("sideCards.card1.textColor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 h-8 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Card 2</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                  <textarea
                    value={landingData.sideCards.card2.title}
                    onChange={(e) => updateField("sideCards.card2.title", e.target.value)}
                    placeholder="Casual\nComfort"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image</label>
                  <input
                    type="text"
                    value={landingData.sideCards.card2.image}
                    onChange={(e) => updateField("sideCards.card2.image", e.target.value)}
                    placeholder="https://... (1:1 ratio)"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ImageKitUpload
                    onUploadSuccess={(url) => updateField("sideCards.card2.image", url)}
                    folder="landing-page/cards"
                    buttonText="📤 Upload"
                    buttonClassName="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                    showPreview={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link</label>
                  <input
                    type="text"
                    value={landingData.sideCards.card2.link}
                    onChange={(e) => updateField("sideCards.card2.link", e.target.value)}
                    placeholder="/men"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">BG Color</label>
                    <input
                      type="color"
                      value={landingData.sideCards.card2.bgColor}
                      onChange={(e) => updateField("sideCards.card2.bgColor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 h-8 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Text Color</label>
                    <input
                      type="color"
                      value={landingData.sideCards.card2.textColor}
                      onChange={(e) => updateField("sideCards.card2.textColor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 h-8 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Card 3</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                  <textarea
                    value={landingData.sideCards.card3.title}
                    onChange={(e) => updateField("sideCards.card3.title", e.target.value)}
                    placeholder="Get\nSingle T-shirt"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image</label>
                  <input
                    type="text"
                    value={landingData.sideCards.card3.image}
                    onChange={(e) => updateField("sideCards.card3.image", e.target.value)}
                    placeholder="https://... (1:1 ratio)"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ImageKitUpload
                    onUploadSuccess={(url) => updateField("sideCards.card3.image", url)}
                    folder="landing-page/cards"
                    buttonText="📤 Upload"
                    buttonClassName="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                    showPreview={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link</label>
                  <input
                    type="text"
                    value={landingData.sideCards.card3.link}
                    onChange={(e) => updateField("sideCards.card3.link", e.target.value)}
                    placeholder="/products"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">BG Color</label>
                    <input
                      type="color"
                      value={landingData.sideCards.card3.bgColor}
                      onChange={(e) => updateField("sideCards.card3.bgColor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 h-8 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Text Color</label>
                    <input
                      type="color"
                      value={landingData.sideCards.card3.textColor}
                      onChange={(e) => updateField("sideCards.card3.textColor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 h-8 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Banner */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🖼️ Middle Banner</h2>
          
          {/* Ratio Info */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">📐 Recommended Ratio: <strong>16:9</strong> (1920x1080px or larger)</p>
            <p className="text-xs text-amber-700 mt-1">💡 This banner is displayed in the middle section of the landing page</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Banner Image URL</label>
            <input
              type="text"
              value={landingData.middleBanner.image}
              onChange={(e) => updateField("middleBanner.image", e.target.value)}
              placeholder="https://... (16:9 ratio)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ImageKitUpload
              onUploadSuccess={(url) => updateField("middleBanner.image", url)}
              folder="landing-page/banners"
              buttonText="📤 Upload Banner"
              buttonClassName="mt-2 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              showPreview={true}
            />
          </div>
        </div>

        {/* Promo Cards */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🎁 Promo Cards (Sale & Bulk)</h2>
          
          {/* Ratio Info */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">📐 Recommended Ratio: <strong>1:1</strong> (Square - 500x500px or larger)</p>
            <p className="text-xs text-amber-700 mt-1">💡 These are 2 promo cards (Sale & Bulk) displayed side by side</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sale Card */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Sale Card</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image</label>
                  <input
                    type="text"
                    value={landingData.promoCards.sale.image}
                    onChange={(e) => updateField("promoCards.sale.image", e.target.value)}
                    placeholder="https://... (1:1 ratio)"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ImageKitUpload
                    onUploadSuccess={(url) => updateField("promoCards.sale.image", url)}
                    folder="landing-page/promo"
                    buttonText="📤 Upload"
                    buttonClassName="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                    showPreview={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link</label>
                  <input
                    type="text"
                    value={landingData.promoCards.sale.link}
                    onChange={(e) => updateField("promoCards.sale.link", e.target.value)}
                    placeholder="/products"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Card */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Bulk Card</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image</label>
                  <input
                    type="text"
                    value={landingData.promoCards.bulk.image}
                    onChange={(e) => updateField("promoCards.bulk.image", e.target.value)}
                    placeholder="https://... (1:1 ratio)"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ImageKitUpload
                    onUploadSuccess={(url) => updateField("promoCards.bulk.image", url)}
                    folder="landing-page/promo"
                    buttonText="📤 Upload"
                    buttonClassName="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                    showPreview={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link</label>
                  <input
                    type="text"
                    value={landingData.promoCards.bulk.link}
                    onChange={(e) => updateField("promoCards.bulk.link", e.target.value)}
                    placeholder="/bulk"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Carousel */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🎬 Video Carousel</h2>
          <p className="text-sm text-slate-600 mb-4">Manage videos in the "Here are our products' live reviews" section</p>
          
          {/* Ratio Info */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">📐 Recommended Ratio: <strong>9:16</strong> (Vertical - 1080x1920px or larger)</p>
            <p className="text-xs text-amber-700 mt-1">💡 Videos are displayed in a carousel format. Vertical videos work best for mobile viewing</p>
          </div>
          
          {/* Supported formats info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">📹 Supported Video Formats:</p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4">
              <li>✅ <strong>YouTube:</strong> https://youtube.com/watch?v=VIDEO_ID</li>
              <li>✅ <strong>YouTube Short:</strong> https://youtu.be/VIDEO_ID</li>
              <li>✅ <strong>YouTube Embed:</strong> https://youtube.com/embed/VIDEO_ID</li>
              <li>✅ <strong>Direct Video ID:</strong> Just paste the VIDEO_ID (11 characters)</li>
              <li>✅ <strong>Local Video:</strong> /icons/vid1.mp4</li>
              <li>✅ <strong>External Video:</strong> https://example.com/video.mp4</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            {landingData.videoCarousel.videos && landingData.videoCarousel.videos.length > 0 ? (
              landingData.videoCarousel.videos.map((video, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Video {idx + 1}</label>
                    <button
                      onClick={() => {
                        const newVideos = landingData.videoCarousel.videos.filter((_, i) => i !== idx);
                        updateField("videoCarousel.videos", newVideos);
                      }}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={video}
                    onChange={(e) => {
                      const newVideos = [...landingData.videoCarousel.videos];
                      newVideos[idx] = e.target.value;
                      updateField("videoCarousel.videos", newVideos);
                    }}
                    placeholder="https://youtube.com/watch?v=... or /icons/vid1.mp4 (9:16 ratio)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Supports YouTube links, local paths, and external video URLs
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500">
                <p>No videos added yet. Click "Add Video" to get started.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const newVideos = [...(landingData.videoCarousel.videos || []), ""];
              updateField("videoCarousel.videos", newVideos);
            }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            ➕ Add Video
          </button>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "💾 Save All Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
