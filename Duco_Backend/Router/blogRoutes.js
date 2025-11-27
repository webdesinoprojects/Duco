const express = require('express');
const router = express.Router();
const {
  getPublishedBlogs,
  getBlogBySlug,
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog,
  getFeaturedBlogs,
} = require('../Controller/blogController');

// Public routes
router.get('/published', getPublishedBlogs);
router.get('/featured', getFeaturedBlogs);
router.get('/slug/:slug', getBlogBySlug);
router.post('/:id/like', likeBlog);

// Admin routes (add authentication middleware if needed)
router.get('/admin/all', getAllBlogs);
router.get('/admin/:id', getBlogById);
router.post('/admin/create', createBlog);
router.put('/admin/:id', updateBlog);
router.delete('/admin/:id', deleteBlog);

module.exports = router;
