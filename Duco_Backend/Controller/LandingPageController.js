const LandingPage = require('../DataBase/Models/LandingPageModel');

// Get or create default landing page data
exports.getLandingPage = async (req, res) => {
  try {
    let landingPage = await LandingPage.findOne();

    if (!landingPage) {
      // Create default landing page if it doesn't exist
      landingPage = await LandingPage.create({});
      console.log('✅ Created default landing page');
    }

    res.json({
      success: true,
      data: landingPage,
    });
  } catch (err) {
    console.error('❌ Error fetching landing page:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Update landing page data
exports.updateLandingPage = async (req, res) => {
  try {
    const { body } = req;

    // Find existing or create new
    let landingPage = await LandingPage.findOne();
    if (!landingPage) {
      landingPage = new LandingPage();
    }

    // Update fields
    if (body.heroSection) {
      landingPage.heroSection = { ...landingPage.heroSection, ...body.heroSection };
    }
    if (body.sideCards) {
      landingPage.sideCards = { ...landingPage.sideCards, ...body.sideCards };
    }
    if (body.middleBanner) {
      landingPage.middleBanner = { ...landingPage.middleBanner, ...body.middleBanner };
    }
    if (body.promoCards) {
      landingPage.promoCards = { ...landingPage.promoCards, ...body.promoCards };
    }
    if (body.videoCarousel) {
      landingPage.videoCarousel = { ...landingPage.videoCarousel, ...body.videoCarousel };
    }

    await landingPage.save();

    console.log('✅ Landing page updated');
    res.json({
      success: true,
      data: landingPage,
      message: 'Landing page updated successfully',
    });
  } catch (err) {
    console.error('❌ Error updating landing page:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Reset to defaults
exports.resetLandingPage = async (req, res) => {
  try {
    await LandingPage.deleteMany({});
    const landingPage = await LandingPage.create({});

    console.log('✅ Landing page reset to defaults');
    res.json({
      success: true,
      data: landingPage,
      message: 'Landing page reset to defaults',
    });
  } catch (err) {
    console.error('❌ Error resetting landing page:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
