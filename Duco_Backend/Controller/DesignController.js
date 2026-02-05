// controllers/DesignController.js
const Design = require('../DataBase/Models/DesignModel');
const { uploadBase64ToCloudinary } = require('../utils/cloudinaryUpload');

const DESIGN_VIEWS = ['front', 'back', 'left', 'right'];

const isBase64Image = (value) => {
  if (typeof value !== 'string') return false;
  return value.startsWith('data:image/') || value.includes('base64,');
};

const removeBase64Deep = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeBase64Deep(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const cleaned = {};
    Object.entries(value).forEach(([key, val]) => {
      if (isBase64Image(val)) {
        return;
      }
      const next = removeBase64Deep(val);
      if (next !== undefined) {
        cleaned[key] = next;
      }
    });
    return cleaned;
  }

  if (isBase64Image(value)) {
    return undefined;
  }

  return value;
};

const extractPreviewImages = (design) => {
  const previews = [];
  if (!Array.isArray(design) || design.length === 0) {
    return previews;
  }

  const firstDesign = design[0] || {};

  DESIGN_VIEWS.forEach((view) => {
    const viewData = firstDesign?.[view];
    const uploadedImage = viewData?.uploadedImage;
    const previewImage = firstDesign?.previewImages?.[view];

    if (isBase64Image(uploadedImage)) {
      previews.push({ view, data: uploadedImage });
      return;
    }

    if (isBase64Image(previewImage)) {
      previews.push({ view, data: previewImage });
    }
  });

  return previews;
};

const uploadPreviewImages = async (previews, userId) => {
  const results = [];
  for (const item of previews) {
    try {
      const uploaded = await uploadBase64ToCloudinary(
        item.data,
        `design-${item.view}-${userId}-${Date.now()}`,
        `duco/designs/${userId}`
      );
      if (uploaded?.url) {
        results.push({
          view: item.view,
          url: uploaded.url,
          publicId: uploaded.publicId || undefined
        });
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${item.view} preview:`, error.message);
    }
  }

  return results;
};

// 👉 Create Design
const createDesign = async (req, res) => {
  try {
    const { user, products, cutomerprodcuts, design } = req.body;

    if (!user || !design) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Extract additional files metadata from design array
    let additionalFilesMeta = [];
    let cleanedDesign = design; // Copy the design array

    if (Array.isArray(design) && design.length > 0) {
      const firstDesign = design[0];
      
      console.log('🔍 DEBUG - firstDesign.additionalFilesMeta:', {
        type: typeof firstDesign.additionalFilesMeta,
        value: firstDesign.additionalFilesMeta,
        isArray: Array.isArray(firstDesign.additionalFilesMeta)
      });
      
      // Extract additional files metadata
      if (firstDesign.additionalFilesMeta) {
        let fileMeta = firstDesign.additionalFilesMeta;
        
        // Handle if it's a stringified JSON (possibly double-stringified)
        while (typeof fileMeta === 'string') {
          try {
            fileMeta = JSON.parse(fileMeta);
            console.log('🔄 Parsed additionalFilesMeta, new type:', typeof fileMeta);
          } catch (e) {
            console.error('❌ Failed to parse additionalFilesMeta:', e.message);
            fileMeta = [];
            break;
          }
        }
        
        if (Array.isArray(fileMeta)) {
          additionalFilesMeta = fileMeta.map(f => ({
            name: String(f.name || ''),
            size: Number(f.size || 0),
            type: String(f.type || '')
          }));
          console.log('✅ Additional files extracted:', additionalFilesMeta);
        }
      }
      
      // ✅ Clean the design array by removing stringified additionalFilesMeta
      cleanedDesign = design.map(d => {
        const cleaned = { ...d };
        delete cleaned.additionalFilesMeta; // Remove from design object
        return cleaned;
      });
    }

    // ✅ Upload preview images to Cloudinary and strip base64 from design
    const previewCandidates = extractPreviewImages(design);
    const previewImages = await uploadPreviewImages(previewCandidates, user);

    cleanedDesign = removeBase64Deep(cleanedDesign);

    const newDesign = new Design({
      user,
      products,
      cutomerprodcuts,
      design: cleanedDesign,
      previewImages,
      additionalFilesMeta
    });

    const saved = await newDesign.save();
    
    console.log('✅ Design saved with:', {
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
        hasPreviewImages: Array.isArray(d.previewImages) && d.previewImages.length > 0,
        hasFiles: d.additionalFilesMeta?.length > 0,
        previewImagesKeys: Array.isArray(d.previewImages)
          ? d.previewImages.map((img) => img.view)
          : []
      }))
    });

    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = { createDesign, deleteDesign, getDesignsByUser };
