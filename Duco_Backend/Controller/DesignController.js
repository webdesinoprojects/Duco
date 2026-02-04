// controllers/DesignController.js
const Design = require('../DataBase/Models/DesignModel');

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

    const newDesign = new Design({
      user,
      products,
      cutomerprodcuts,
      design: cleanedDesign,
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
