import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { toast } from 'react-toastify';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchBlog();
    window.scrollTo(0, 0);
  }, [slug]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/blogs/slug/${slug}`);
      
      if (response.data.success) {
        setBlog(response.data.blog);
        fetchRelatedBlogs(response.data.blog.category);
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Blog not found');
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedBlogs = async (category) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/blogs/published`, {
        params: { category, limit: 3 },
      });
      
      if (response.data.success) {
        setRelatedBlogs(response.data.blogs.filter(b => b.slug !== slug));
      }
    } catch (error) {
      console.error('Error fetching related blogs:', error);
    }
  };

  const handleLike = async () => {
    if (liked) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/blogs/${blog._id}/like`);
      
      if (response.data.success) {
        setBlog({ ...blog, likes: response.data.likes });
        setLiked(true);
        toast.success('Thanks for liking!');
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5C870]"></div>
      </div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Image */}
      <div className="relative h-[60vh] overflow-hidden">
        <img
          src={blog.featuredImage}
          alt={blog.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent"></div>
        
        {/* Breadcrumb */}
        <div className="absolute top-8 left-8">
          <Link to="/blog" className="text-white/80 hover:text-white transition">
            ← Back to Blog
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        {/* Category Badge */}
        <div className="mb-4">
          <span className="px-4 py-2 bg-[#E5C870] text-black text-sm font-semibold rounded-full">
            {blog.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          {blog.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-6 mb-8 text-gray-400">
          <div className="flex items-center gap-3">
            <img
              src={blog.author.avatar || 'https://ik.imagekit.io/vuavxn05l/duco-logo.png?updatedAt=1757162698605'}
              alt={blog.author.name}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.target.src = 'https://ik.imagekit.io/vuavxn05l/duco-logo.png?updatedAt=1757162698605';
              }}
            />
            <div>
              <p className="text-white font-semibold">{blog.author.name}</p>
              <p className="text-sm">{formatDate(blog.publishedAt || blog.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span>{blog.views} views</span>
            <span>•</span>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition ${
                liked ? 'text-red-500' : 'hover:text-[#E5C870]'
              }`}
            >
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{blog.likes} likes</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#111] rounded-lg p-8 mb-12">
          <div 
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
            style={{
              color: '#fff',
              lineHeight: '1.8',
            }}
          />
        </div>

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[#111] rounded-full text-sm hover:bg-[#222] transition cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="mb-12 p-6 bg-[#111] rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Share this article</h3>
          <div className="flex gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
              }}
              className="px-4 py-2 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] transition"
            >
              Copy Link
            </button>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(blog.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:opacity-90 transition"
            >
              Share on Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#4267B2] text-white rounded-lg hover:opacity-90 transition"
            >
              Share on Facebook
            </a>
          </div>
        </div>

        {/* Related Posts */}
        {relatedBlogs.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-6">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBlogs.map((relatedBlog) => (
                <Link
                  key={relatedBlog._id}
                  to={`/blog/${relatedBlog.slug}`}
                  className="group bg-[#111] rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={relatedBlog.featuredImage}
                      alt={relatedBlog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold mb-2 line-clamp-2 group-hover:text-[#E5C870] transition">
                      {relatedBlog.title}
                    </h4>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {relatedBlog.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPost;
