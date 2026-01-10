// controllers/DesignController.js
const Design = require('../DataBase/Models/DesignModel');

// 👉 Create Design
const createDesign = async (req, res) => {
  try {
    const { user, products, cutomerprodcuts, design } = req.body;

    if (!user || !design) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Extract preview images and files from design array
    let previewImages = {};
    let additionalFilesMeta = [];

    if (Array.isArray(design) && design.length > 0) {
      const firstDesign = design[0];
      
      // Extract preview images
      if (firstDesign.previewImages && typeof firstDesign.previewImages === 'object') {
        previewImages = {
          front: firstDesign.previewImages.front || null,
          back: firstDesign.previewImages.back || null,
          left: firstDesign.previewImages.left || null,
          right: firstDesign.previewImages.right || null
        };
        console.log('✅ Preview images extracted:', {
          front: !!previewImages.front,
          back: !!previewImages.back,
          left: !!previewImages.left,
          right: !!previewImages.right
        });
      }

      // Extract additional files metadata
      if (Array.isArray(firstDesign.additionalFilesMeta)) {
        additionalFilesMeta = firstDesign.additionalFilesMeta.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }));
        console.log('✅ Additional files extracted:', additionalFilesMeta.length);
      }
    }

    const newDesign = new Design({
      user,
      products,
      cutomerprodcuts,
      design,
      previewImages,
      additionalFilesMeta
    });

    const saved = await newDesign.save();
    
    console.log('✅ Design saved with:', {
      hasPreviewImages: !!saved.previewImages,
      hasFiles: saved.additionalFilesMeta?.length > 0
    });

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating design:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 👉 Delete Design by ID
const deleteDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Design.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Design not found' });
    }

    res.status(200).json({ message: 'Design deleted successfully' });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

const getDesignsByUser = async (req, res) => {
  try {
    const { userId, productId } = req.params;

    let query = { user: userId };
    if (productId) {
      query.products = productId;
    }

    const designs = await Design.find(query).sort({ createdAt: -1 });

    // ✅ Log what's being returned
    console.log('📦 Returning designs:', {
      count: designs.length,
      designs: designs.map(d => ({
        _id: d._id,
        hasPreviewImages: !!d.previewImages,
        hasFiles: d.additionalFilesMeta?.length > 0,
        previewImagesKeys: d.previewImages ? Object.keys(d.previewImages) : []
      }))
    });

    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = { createDesign, deleteDesign, getDesignsByUser };
