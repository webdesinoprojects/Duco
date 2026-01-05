import React from "react";
import { FaAward, FaUsers, FaGlobeAmericas, FaHeart } from "react-icons/fa";

const About = () => {
  return (
    <div className="min-h-screen text-white bg-[#0A0A0A]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="text-[#E5C870]">DUCO ART</span>
          </h1>
          <div className="w-24 h-1 bg-[#E5C870] mx-auto mb-6"></div>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Transforming ideas into wearable art. We believe in creativity, quality, and sustainability.
          </p>
        </div>

        {/* Our Story Section */}
        <div className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-[#E5C870]">Our Story</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                DUCO ART was founded with a simple vision: to make custom apparel accessible to everyone. 
                What started as a small passion project has grown into a thriving community of creators, 
                designers, and fashion enthusiasts.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                We believe that clothing is more than just fabric—it's a form of self-expression. 
                Whether you're designing a unique t-shirt for yourself, creating merchandise for your brand, 
                or ordering in bulk for your organization, we're here to bring your vision to life.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Our commitment to quality, innovation, and customer satisfaction drives everything we do. 
                From the moment you start designing to the moment your order arrives at your doorstep, 
                we ensure an exceptional experience.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#E5C870] to-[#d4b55f] rounded-xl p-8 text-black">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">🎨 Our Mission</h3>
                  <p className="text-sm">
                    To empower individuals and businesses to express their creativity through custom apparel 
                    with exceptional quality and service.
                  </p>
                </div>
                <div className="border-t border-black/20 pt-6">
                  <h3 className="text-2xl font-bold mb-2">🌟 Our Vision</h3>
                  <p className="text-sm">
                    To become the most trusted platform for custom apparel, where creativity meets quality 
                    and every design tells a unique story.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Us Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#E5C870]">Why Choose DUCO ART?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Quality */}
            <div className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transition duration-300">
              <div className="text-4xl mb-4 text-[#E5C870]">
                <FaAward />
              </div>
              <h3 className="text-xl font-bold mb-3">Premium Quality</h3>
              <p className="text-gray-400 text-sm">
                We use only the finest materials and printing techniques to ensure your designs look stunning 
                and last for years.
              </p>
            </div>

            {/* Community */}
            <div className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transition duration-300">
              <div className="text-4xl mb-4 text-[#E5C870]">
                <FaUsers />
              </div>
              <h3 className="text-xl font-bold mb-3">Vibrant Community</h3>
              <p className="text-gray-400 text-sm">
                Join thousands of creators and designers who trust DUCO ART. Share your designs, 
                get inspired, and grow together.
              </p>
            </div>

            {/* Global Reach */}
            <div className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transition duration-300">
              <div className="text-4xl mb-4 text-[#E5C870]">
                <FaGlobeAmericas />
              </div>
              <h3 className="text-xl font-bold mb-3">Global Reach</h3>
              <p className="text-gray-400 text-sm">
                We ship worldwide with reliable logistics partners. No matter where you are, 
                we'll get your order to you safely and on time.
              </p>
            </div>

            {/* Passion */}
            <div className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transition duration-300">
              <div className="text-4xl mb-4 text-[#E5C870]">
                <FaHeart />
              </div>
              <h3 className="text-xl font-bold mb-3">Passion Driven</h3>
              <p className="text-gray-400 text-sm">
                We're passionate about what we do. Your satisfaction is our success, 
                and we go the extra mile to make sure you're happy.
              </p>
            </div>
          </div>
        </div>

        {/* Our Values Section */}
        <div className="mb-20 bg-gray-900 p-12 rounded-xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#E5C870]">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-3 text-[#E5C870]">Creativity</h3>
              <p className="text-gray-400">
                We celebrate individuality and encourage everyone to express their unique style 
                through custom apparel.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-3 text-[#E5C870]">Quality</h3>
              <p className="text-gray-400">
                Excellence is non-negotiable. From design to delivery, we maintain the highest 
                standards in everything we do.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-3 text-[#E5C870]">Sustainability</h3>
              <p className="text-gray-400">
                We're committed to eco-friendly practices and responsible manufacturing to protect 
                our planet for future generations.
              </p>
            </div>
          </div>
        </div>

        {/* What We Offer Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#E5C870]">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-l-4 border-[#E5C870] pl-6">
              <h3 className="text-xl font-bold mb-3">Custom T-Shirt Design</h3>
              <p className="text-gray-400">
                Use our intuitive designer tool to create stunning custom t-shirts. 
                Choose from thousands of designs or upload your own artwork.
              </p>
            </div>
            <div className="border-l-4 border-[#E5C870] pl-6">
              <h3 className="text-xl font-bold mb-3">Bulk Orders</h3>
              <p className="text-gray-400">
                Perfect for businesses, events, and organizations. Get competitive pricing 
                on large orders with dedicated support.
              </p>
            </div>
            <div className="border-l-4 border-[#E5C870] pl-6">
              <h3 className="text-xl font-bold mb-3">Multiple Payment Options</h3>
              <p className="text-gray-400">
                We accept various payment methods including online payments, bank transfers, 
                and flexible payment plans for bulk orders.
              </p>
            </div>
            <div className="border-l-4 border-[#E5C870] pl-6">
              <h3 className="text-xl font-bold mb-3">Fast Delivery</h3>
              <p className="text-gray-400">
                Quick turnaround times with reliable shipping. Track your order in real-time 
                and know exactly when it will arrive.
              </p>
            </div>
            <div className="border-l-4 border-[#E5C870] pl-6">
              <h3 className="text-xl font-bold mb-3">Customer Support</h3>
              <p className="text-gray-400">
                Our dedicated support team is here to help. Contact us via email, phone, 
                or live chat for any questions or concerns.
              </p>
            </div>
            <div className="border-l-4 border-[#E5C870] pl-6">
              <h3 className="text-xl font-bold mb-3">Quality Guarantee</h3>
              <p className="text-gray-400">
                We stand behind our products. If you're not satisfied, we'll make it right 
                with our hassle-free return policy.
              </p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-bold mb-6 text-[#E5C870]">Our Team</h2>
          <p className="text-gray-300 max-w-3xl mx-auto mb-8">
            Behind DUCO ART is a passionate team of designers, developers, and customer service experts 
            dedicated to making your experience exceptional. We're constantly innovating and improving 
            to serve you better.
          </p>
          <div className="bg-gray-900 p-8 rounded-xl inline-block">
            <p className="text-[#E5C870] font-bold text-lg">
              Join us on our journey to revolutionize custom apparel! 🚀
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-[#E5C870] to-[#d4b55f] rounded-xl p-12 text-center text-black">
          <h2 className="text-3xl font-bold mb-4">Ready to Create Something Amazing?</h2>
          <p className="mb-6 text-lg">
            Start designing your custom apparel today and join thousands of satisfied customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/design/1/black"
              className="bg-black text-[#E5C870] px-8 py-3 rounded-lg font-bold hover:bg-gray-900 transition duration-300"
            >
              Start Designing
            </a>
            <a
              href="/contact"
              className="bg-black text-[#E5C870] px-8 py-3 rounded-lg font-bold hover:bg-gray-900 transition duration-300"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
