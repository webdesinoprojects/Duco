// controllers/DesignController.js
const Design = require('../DataBase/Models/DesignModel');

// 👉 Create Design
const createDesign = async (req, res) => {
  try {
    const { user, products ,cutomerprodcuts, design } = req.body;

    if (!user  || !design) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newDesign = new Design({ user, products, design ,cutomerprodcuts });
    const saved = await newDesign.save();
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

    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = { createDesign, deleteDesign  ,getDesignsByUser};
