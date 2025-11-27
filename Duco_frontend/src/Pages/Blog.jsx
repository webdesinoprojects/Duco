import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  const categories = ['all', 'Fashion', 'Design', 'Business', 'Tips', 'News', 'Tutorial'];

  useEffect(() => {
    fetchBlogs();
  }, [selectedCategory, pagination.page]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 9,
      };
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(`${API_BASE_URL}/api/blogs/published`, { params });
      
      if (response.data.success) {
        setBlogs(response.data.blogs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBlogs();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#E5C870] to-[#D4B752] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-4">
            DUCO ART Blog
          </h1>
          <p className="text-xl text-black/80 max-w-2xl">
            Discover the latest trends in fashion, design tips, and business insights
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-[#111] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#E5C870] text-black rounded-md hover:bg-[#D4B752] transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setPagination({ ...pagination, page: 1 });
                }}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  selectedCategory === category
                    ? 'bg-[#E5C870] text-black'
                    : 'bg-[#111] text-white hover:bg-[#222]'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5C870]"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">No articles found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Link
                  key={blog._id}
                  to={`/blog/${blog.slug}`}
                  className="group bg-[#111] rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={blog.featuredImage}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-[#E5C870] text-black text-sm font-semibold rounded-full">
                        {blog.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                      <span>•</span>
                      <span>{blog.views} views</span>
                    </div>

                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#E5C870] transition line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="text-gray-400 mb-4 line-clamp-3">
                      {blog.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={blog.author.avatar}
                          alt={blog.author.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm text-gray-400">{blog.author.name}</span>
                      </div>

                      <span className="text-[#E5C870] group-hover:translate-x-2 transition-transform">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-[#111] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#222] transition"
                >
                  Previous
                </button>

                {[...Array(pagination.pages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagination({ ...pagination, page: i + 1 })}
                    className={`px-4 py-2 rounded-lg transition ${
                      pagination.page === i + 1
                        ? 'bg-[#E5C870] text-black'
                        : 'bg-[#111] hover:bg-[#222]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 bg-[#111] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#222] transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;
