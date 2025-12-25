import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Youtube, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import logo from "../assets/image.png";

const Footer = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);
  return (
    <footer className="w-full text-black mt-20  px-4">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row gap-2 bg-black  w-full  ">
        {/* Left - Contact Info */}
        <div className="bg-white p-6 rounded-2xl flex-[1] min-w-[250px]">
          <Link to={"/"}>
            {" "}
            <img src={logo} alt="DUCO ART" className="w-32 mb-4" />
          </Link>
          <p className="mb-1">Phone :+91 9827245678</p>
          <p>Email : duco@ducoart.com</p>
        </div>

        {/* Right - Navigation */}
        <div className="bg-white p-6 rounded-2xl flex-[3]">
          <div className="grid grid-cols-1  sm:px-[100px] sm:grid-cols-3 gap-1">
            {/* Shop */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Shop</h3>
              <ul className="space-y-1  text-sm">
                <li>
                  <Link to="/" className="hover:text-[#E5C870]">
                    New
                  </Link>
                </li>
                <li>
                  <Link to="/women" className="hover:text-[#E5C870]">
                    Women
                  </Link>
                </li>
                <li>
                  <Link to="/men" className="hover:text-[#E5C870]">
                    Men
                  </Link>
                </li>
                <li>
                  <Link to="/kid" className="hover:text-[#E5C870]">
                    Kid
                  </Link>
                </li>
              </ul>
            </div>

            {/* Our Store */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Our Store</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link to="/about" className="hover:text-[#E5C870]">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-[#E5C870]">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/order" className="hover:text-[#E5C870]">
                    My Order
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#E5C870]">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/wallet/${user?._id}`}
                    className="hover:text-[#E5C870]"
                  >
                    Wallet
                  </Link>
                </li>

                <li>
                  <a
                    href="mailto:duco@ducoart.com"
                    className="hover:text-[#E5C870]"
                  >
                    Help and support
                  </a>
                </li>
              </ul>
            </div>

            {/* Terms */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Term & Conditions</h3>
              <ul className="space-y-1 text-sm mb-8">
                <li>
                  <Link to="/privacy-policy" className="hover:text-[#E5C870]">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/refund-return-policy"
                    className="hover:text-[#E5C870]"
                  >
                    Refund & Return Policy
                  </Link>
                </li>
                <li>
                  <Link to="/shipping-policy" className="hover:text-[#E5C870]">
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-and-conditions"
                    className="hover:text-[#E5C870]"
                  >
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col md:flex-row gap-2  mt-2   min-w-[250px]">
        {/* Social Icons */}
        <div className="bg-white px-[22px] rounded-2xl flex items-center gap-6 justify-center md:justify-start flex-1">
          <a
            href="https://www.instagram.com/ducoart_/?hl=en"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram className="w-6 h-6 hover:text-pink-600 transition-colors" />
          </a>
          <a
            href="https://youtube.com/@ducoart?feature=shared"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Youtube className="w-6 h-6 hover:text-red-600 transition-colors" />
          </a>
          <a
            href="https://www.facebook.com/duco.art.2025"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="w-6 h-6 hover:text-blue-600 transition-colors" />
          </a>
          <a
            href="https://www.linkedin.com/in/duco-art-837297214/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin className="w-6 h-6 hover:text-blue-700 transition-colors" />
          </a>
          <a
            href="https://in.pinterest.com/ducoart1"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-500 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-current"
            >
              <path d="M568 320C568 457 457 568 320 568C294.4 568 269.8 564.1 246.6 556.9C256.7 540.4 271.8 513.4 277.4 491.9C280.4 480.3 292.8 432.9 292.8 432.9C300.9 448.3 324.5 461.4 349.6 461.4C424.4 461.4 478.3 392.6 478.3 307.1C478.3 225.2 411.4 163.9 325.4 163.9C218.4 163.9 161.5 235.7 161.5 314C161.5 350.4 180.9 395.7 211.8 410.1C216.5 412.3 219 411.3 220.1 406.8C220.9 403.4 225.1 386.5 227 378.7C227.6 376.2 227.3 374 225.3 371.6C215.2 359.1 207 336.3 207 315C207 260.3 248.4 207.4 319 207.4C379.9 207.4 422.6 248.9 422.6 308.3C422.6 375.4 388.7 421.9 344.6 421.9C320.3 421.9 302 401.8 307.9 377.1C314.9 347.6 328.4 315.8 328.4 294.5C328.4 275.5 318.2 259.6 297 259.6C272.1 259.6 252.1 285.3 252.1 319.8C252.1 341.8 259.5 356.6 259.5 356.6C259.5 356.6 235 460.4 230.5 479.8C225.5 501.2 227.5 531.4 229.6 551C137.4 514.9 72 425.1 72 320C72 183 183 72 320 72C457 72 568 183 568 320z" />
            </svg>
          </a>

          <a
            href="https://x.com/ArtDuco"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              width="24"
              height="24"
              viewBox="0 0 30 30"
            >
              <path d="M26.37,26l-8.795-12.822l0.015,0.012L25.52,4h-2.65l-6.46,7.48L11.28,4H4.33l8.211,11.971L12.54,15.97L3.88,26h2.65 l7.182-8.322L19.42,26H26.37z M10.23,6l12.34,18h-2.1L8.12,6H10.23z"></path>
            </svg>{" "}
          </a>
        </div>

        {/* Footer Text */}
        <div className="bg-[#E5C870] text-center p-4 rounded-2xl flex-[3]">
          <p className="text-black font-medium text-sm">
            © 2025 Ducoart. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
