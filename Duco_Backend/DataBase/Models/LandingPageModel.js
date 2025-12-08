const mongoose = require('mongoose');

const LandingPageSchema = new mongoose.Schema(
  {
    // Hero Section
    heroSection: {
      mainImage: { type: String, default: "" },
      heroText: { type: String, default: "Color Of Summer Outfit" },
      buttonText: { type: String, default: "Shop the Look →" },
      buttonLink: { type: String, default: "/women" },
    },

    // Side Cards
    sideCards: {
      card1: {
        title: { type: String, default: "Naturally\nStyled" },
        image: { type: String, default: "" },
        link: { type: String, default: "/men" },
        bgColor: { type: String, default: "#3a3a3a" },
        textColor: { type: String, default: "#E5C870" },
      },
      card2: {
        title: { type: String, default: "Casual\nComfort" },
        image: { type: String, default: "" },
        link: { type: String, default: "/men" },
        bgColor: { type: String, default: "#e2c565" },
        textColor: { type: String, default: "#000000" },
      },
      card3: {
        title: { type: String, default: "Get\nSingle T-shirt" },
        image: { type: String, default: "" },
        link: { type: String, default: "/products" },
        bgColor: { type: String, default: "#ffffff" },
        textColor: { type: String, default: "#000000" },
      },
    },

    // Middle Banner
    middleBanner: {
      image: { type: String, default: "https://ik.imagekit.io/vuavxn05l/5213288.jpg?updatedAt=1757162698605" },
    },

    // Promo Cards
    promoCards: {
      sale: {
        title: { type: String, default: "SALE\n20% OFF" },
        image: { type: String, default: "" },
        link: { type: String, default: "/products" },
        bgColor: { type: String, default: "#ffffff" },
      },
      bulk: {
        title: { type: String, default: "Get\nBULK\nT-SHIRT" },
        image: { type: String, default: "" },
        link: { type: String, default: "/bulk" },
        bgColor: { type: String, default: "#ffffff" },
      },
    },

    // Video Carousel
    videoCarousel: {
      videos: [
        { type: String, default: "/icons/vid1.mp4" },
        { type: String, default: "/icons/vid2.mp4" },
        { type: String, default: "/icons/vid3.mp4" },
        { type: String, default: "/icons/vid4.mp4" },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LandingPage', LandingPageSchema);
