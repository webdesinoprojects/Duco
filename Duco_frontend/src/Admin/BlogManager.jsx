import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/api';
import ImageKitUpload from '../Components/ImageKitUpload';

const BlogManager = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    category: 'Fashion',
    tags: '',
    status: 'draft',
    author: {
      name: 'DUCO ART Team',
      avatar: '/icons/default-avatar.png',
    },
  });

  useEffect(() => {
    fetchBlogs();
  }, [filter]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`${API_BASE_URL}/api/blogs/admin/all`, { params });
      
      if (response.data.success) {
        setBlogs(response.data.blogs);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'title' && !editingBlog) {
      // Auto-generate slug from title
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData({ ...formData, title: value, slug });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const blogData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      let response;
      if (editingBlog) {
        response = await axios.put(`${API_BASE_URL}/api/blogs/admin/${editingBlog._id}`, blogData);
        toast.success('Blog updated successfully!');
      } else {
        response = await axios.post(`${API_BASE_URL}/api/blogs/admin/create`, blogData);
        toast.success('Blog created successfully!');
      }

      if (response.data.success) {
        setShowModal(false);
        setEditingBlog(null);
        resetForm();
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error(error.response?.data?.message || 'Failed to save blog');
    }
  };

  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      featuredImage: blog.featuredImage,
      category: blog.category,
      tags: blog.tags.join(', '),
      status: blog.status,
      author: blog.author,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/blogs/admin/${id}`);
      
      if (response.data.success) {
        toast.success('Blog deleted successfully!');
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      category: 'Fashion',
      tags: '',
      status: 'draft',
      author: {
        name: 'DUCO ART Team',
        avatar: '/icons/default-avatar.png',
      },
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Blog Management</h1>
            <p className="text-gray-400 mt-2">Create and manage blog posts</p>
          </div>
          <button
            onClick={() => {
              setEditingBlog(null);
              resetForm();
              setShowModal(true);
            }}
            className="px-6 py-3 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] transition font-semibold"
          >
            + New Blog Post
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          {['all', 'published', 'draft', 'archived'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition ${
                filter === status
                  ? 'bg-[#E5C870] text-black'
                  : 'bg-[#111] hover:bg-[#222]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Blog List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5C870]"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 bg-[#111] rounded-lg">
            <p className="text-gray-400 text-xl">No blogs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {blogs.map((blog) => (
              <div
                key={blog._id}
                className="bg-[#111] rounded-lg p-6 flex gap-6 hover:bg-[#1a1a1a] transition"
              >
                {/* Image */}
                <img
                  src={blog.featuredImage}
                  alt={blog.title}
                  className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{blog.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{blog.excerpt}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        blog.status === 'published'
                          ? 'bg-green-500/20 text-green-400'
                          : blog.status === 'draft'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {blog.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span>{blog.category}</span>
                    <span>•</span>
                    <span>{formatDate(blog.createdAt)}</span>
                    <span>•</span>
                    <span>{blog.views} views</span>
                    <span>•</span>
                    <span>{blog.likes} likes</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(blog)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(blog._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                    {blog.status === 'published' && (
                      <Link
                        to={`/blog/${blog.slug}`}
                        target="_blank"
                        className="px-4 py-2 bg-[#222] text-white rounded-lg hover:bg-[#333] transition"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#111] rounded-lg p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-[#111] py-2 z-10">
                {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Slug *</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                  />
                  <p className="text-xs text-gray-400 mt-1">URL-friendly version of the title</p>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Excerpt *</label>
                  <textarea
                    name="excerpt"
                    value={formData.excerpt}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    maxLength={300}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                  />
                  <p className="text-xs text-gray-400 mt-1">{formData.excerpt.length}/300 characters</p>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Content * (HTML supported)</label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    required
                    rows={8}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870] font-mono text-sm"
                  />
                </div>

                {/* Featured Image */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Featured Image URL (Optional)</label>
                  <input
                    type="url"
                    name="featuredImage"
                    value={formData.featuredImage}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                  />
                  
                  {/* Upload Button */}
                  <div className="mt-3">
                    <ImageKitUpload
                      onUploadSuccess={(uploadedUrl) => {
                        setFormData({ ...formData, featuredImage: uploadedUrl });
                        toast.success('Image uploaded successfully!');
                      }}
                      folder="blog-images"
                      buttonText="📤 Upload Featured Image"
                      buttonClassName="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                      showPreview={false}
                    />
                  </div>
                  
                  {formData.featuredImage && (
                    <div className="mt-3">
                      <img
                        src={formData.featuredImage}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23333"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="16">Image preview failed</text></svg>';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, featuredImage: '' })}
                        className="mt-2 text-sm text-red-400 hover:text-red-300"
                      >
                        ✕ Remove Image
                      </button>
                    </div>
                  )}
                </div>

                {/* Category and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                    >
                      <option value="Fashion">Fashion</option>
                      <option value="Design">Design</option>
                      <option value="Business">Business</option>
                      <option value="Tips">Tips</option>
                      <option value="News">News</option>
                      <option value="Tutorial">Tutorial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="fashion, design, tips"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBlog(null);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-[#222] rounded-lg hover:bg-[#333] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] transition font-semibold"
                  >
                    {editingBlog ? 'Update Blog' : 'Create Blog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogManager;
