import React from 'react';

export default function ExportQuality() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0f2d] to-[#000000] flex justify-center px-4 py-10">
      <div className="max-w-4xl w-full bg-opacity-0 p-8 text-gray-200">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Export Quality Products
        </h1>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Quality Assurance</h2>
          <p className="leading-relaxed">
            At <strong>Ducoart</strong>, we are committed to delivering export-quality products that meet international standards. 
            Our products are manufactured using premium materials and undergo rigorous quality checks to ensure excellence.
          </p>
        </section>

        {/* Standards */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">International Standards</h2>
          <p className="leading-relaxed">
            All our products are designed and manufactured to comply with international quality standards. We follow strict 
            quality control processes at every stage of production to ensure that each product meets the highest benchmarks.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>Premium fabric quality suitable for international markets</li>
            <li>Durable prints and vibrant colors that last</li>
            <li>Precise sizing and measurements</li>
            <li>Eco-friendly and sustainable materials</li>
            <li>Tested for color fastness and durability</li>
          </ul>
        </section>

        {/* Manufacturing */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Manufacturing Excellence</h2>
          <p className="leading-relaxed">
            Our manufacturing processes incorporate the latest technology and best practices to ensure consistent quality. 
            Each product is carefully inspected before packaging to guarantee it meets our export-quality standards.
          </p>
        </section>

        {/* Customization */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Custom Orders & Bulk Export</h2>
          <p className="leading-relaxed">
            We specialize in bulk orders and custom designs for international clients. Whether you need corporate merchandise, 
            branded apparel, or custom artwork on premium products, we can deliver export-quality goods in quantities that 
            suit your business needs.
          </p>
          <p className="leading-relaxed">
            For bulk orders and export inquiries, please contact us at{' '}
            <a href="mailto:duco@ducoart.com" className="text-blue-400 underline">
              duco@ducoart.com
            </a>
          </p>
        </section>

        {/* Certifications */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Quality Certifications</h2>
          <p className="leading-relaxed">
            Our commitment to quality is backed by certifications and compliance with industry standards. We ensure that 
            all materials used are safe, non-toxic, and suitable for global distribution.
          </p>
        </section>

        {/* Guarantee */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Our Guarantee</h2>
          <p className="leading-relaxed">
            We stand behind the quality of our products. If you receive any item that doesn't meet our export-quality 
            standards, we will replace it or provide a full refund. Your satisfaction is our priority.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4 mt-8 pt-6 border-t border-gray-700">
          <p className="text-center">
            For more information about our export-quality products, bulk orders, or custom requirements, 
            please reach out to our team at{' '}
            <a href="mailto:duco@ducoart.com" className="text-blue-400 underline">
              duco@ducoart.com
            </a>{' '}
            or call us at <span className="text-[#E5C870]">+91 9827245678</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
