const express = require('express')
const Banner = require("../DataBase/Models/BannerModel")

const router = express.Router();

router.post("/banners", async (req, res) => {
  try {
    const { link, heroText, buttonText, buttonLink, type, isActive } = req.body;
    if (!link || typeof link !== "string") {
      return res.status(400).json({ error: "Field 'link' is required and must be a string" });
    }

    const bannerData = {
      link,
      heroText: heroText || "Color Of Summer Outfit",
      buttonText: buttonText || "Shop the Look →",
      buttonLink: buttonLink || "/women",
      type: type || 'hero',
      isActive: isActive !== false
    };

    const banner = await Banner.create(bannerData);
    return res.status(201).json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 READ all banners
// GET /api/banners
router.get("/banners", async (req, res) => {
  try {
    const banners = await Banner.find();
    return res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 UPDATE a banner by ID
// PUT /api/banners/:id   { link: "new-link.png", heroText: "...", buttonText: "...", buttonLink: "..." }
router.put("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { link, heroText, buttonText, buttonLink, type, isActive } = req.body;

    if (!link || typeof link !== "string") {
      return res.status(400).json({ error: "Field 'link' is required and must be a string" });
    }

    const updateData = {
      link,
      heroText: heroText || "Color Of Summer Outfit",
      buttonText: buttonText || "Shop the Look →",
      buttonLink: buttonLink || "/women",
      type: type || 'hero',
      isActive: isActive !== false,
      updatedAt: new Date()
    };

    const banner = await Banner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 DELETE a banner by ID
// DELETE /api/banners/:id
router.delete("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.json({ success: true, message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
