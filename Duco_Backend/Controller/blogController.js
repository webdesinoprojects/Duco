const Blog = require('../DataBase/Models/BlogModel');

// Get all published blogs (public)
const getPublishedBlogs = async (req, res) => {
  try {
    const { category, tag, search, page = 1, limit = 10 } = req.query;
    
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content'); // Don't send full content in list
    
    const total = await Blog.countDocuments(query);
    
    res.json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog by slug (public)
const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const blog = await Blog.findOne({ slug, status: 'published' });
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all blogs (admin - includes drafts)
const getAllBlogs = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    
    const skip = (page - 1) * limit;
    
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Blog.countDocuments(query);
    
    res.json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching all blogs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog by ID (admin)
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create blog (admin)
const createBlog = async (req, res) => {
  try {
    const blogData = req.body;
    
    // Check if slug already exists
    if (blogData.slug) {
      const existing = await Blog.findOne({ slug: blogData.slug });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'A blog with this slug already exists' 
        });
      }
    }
    
    const blog = await Blog.create(blogData);
    
    res.status(201).json({ success: true, blog });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update blog (admin)
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If slug is being updated, check for duplicates
    if (updates.slug) {
      const existing = await Blog.findOne({ slug: updates.slug, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'A blog with this slug already exists' 
        });
      }
    }
    
    const blog = await Blog.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true 
    });
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete blog (admin)
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findByIdAndDelete(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like blog
const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    blog.likes += 1;
    await blog.save();
    
    res.json({ success: true, likes: blog.likes });
  } catch (error) {
    console.error('Error liking blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get featured blogs (latest 3 published)
const getFeaturedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(3)
      .select('-content');
    
    res.json({ success: true, blogs });
  } catch (error) {
    console.error('Error fetching featured blogs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublishedBlogs,
  getBlogBySlug,
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog,
  getFeaturedBlogs,
};
