import React from "react";
import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaPaperPlane,
} from "react-icons/fa";

const Contact = () => {
  return (
    <div className="min-h-screen  text-white">
      {/* Decorative elements */}

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-[#E5C870]">Contact</span> Us
          </h1>
          <div className="w-24 h-1 bg-[#E5C870] mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-gray-900 p-8 rounded-xl shadow-lg">
            <form className="space-y-6">
              <div>
                <label className="block mb-2 text-[#E5C870]">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-[#E5C870] focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#E5C870]">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-[#E5C870] focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#E5C870]">Message</label>
                <textarea
                  rows="5"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-[#E5C870] focus:outline-none"
                  placeholder="Your message..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#E5C870] hover:bg-[#d4b55f] text-black font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                <FaPaperPlane /> Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="flex flex-col justify-between">
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-6 text-[#E5C870]">
                Get in Touch
              </h2>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Have questions or want to work together? Fill out the form or
                contact us directly using the information below. We'll get back
                to you as soon as possible.
              </p>

              <div className="space-y-5">
                <div className="flex items-start">
                  <FaMapMarkerAlt className="text-[#E5C870] text-xl mt-1 mr-4" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Our Location</h3>
                    <p className="text-gray-400">
                      Plot No.238, KH No.146, Lal Dora/Abadi of Village, Burari, New Delhi, Central Delhi, Delhi, 110084<br />
                      UDYAM : UDYAM-UP-64-0054061 (Micro/Traders)<br />
                      GSTIN/UIN: 07AESPC7373N2ZR<br />
                      State Name : Delhi, Code : 07<br />
                      <br />
                      {/* Existing address below */}
                      LIG-64, Avanti Vihar Shadija Compound , <br />
                      Raipur(C.G.) INDIA 492007{" "}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FaPhone className="text-[#E5C870] text-xl mt-1 mr-4" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Phone</h3>
                    <p className="text-gray-400"> ‪+91 9827245678‬</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FaEnvelope className="text-[#E5C870] text-xl mt-1 mr-4" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Email</h3>
                    <p className="text-gray-400">duco@ducoart.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Icons */}
            {/* ...existing code... */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;