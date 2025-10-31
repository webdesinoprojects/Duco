import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0f2d] to-[#000000] flex justify-center px-4 py-10">
      <div className="max-w-4xl w-full bg-opacity-0 p-8 text-gray-200">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Privacy Policy
        </h1>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Introduction</h2>
          <p className="leading-relaxed">
            This Privacy Policy describes how <strong>Ducoart</strong> and its affiliates (“we”, “us”, “our”) collect, use, share, and protect your personal information through our website (<a href="https://ducoart.com" className="text-blue-400 underline">ducoart.com</a>) and related services (“Platform”), and it applies to all registered and visiting users. By accessing the Platform, you consent to the practices described here and agree to our Terms of Use and all applicable Indian laws. If you do not agree, please discontinue use.
          </p>
        </section>

        {/* Information Collection */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
          <p className="leading-relaxed">
            We collect personal data you provide during registration or use of our Platform, such as name, address, email, phone number, date of birth, payment details, and other information necessary to provide services. Sensitive personal data is collected only with your explicit consent where required. Usage data (IP address, device/browser details, search queries, interaction logs) and cookies are also collected to enhance user experience, prevent fraud, and improve services.
          </p>
          <p className="leading-relaxed">
            You may opt not to provide certain data, but this can restrict your access to features/services. We may combine information collected from you with information obtained from affiliates or trusted third parties to provide and improve our services.
          </p>
        </section>

        {/* Cookies */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Cookies & Tracking</h2>
          <p className="leading-relaxed">
            We use cookies and similar tracking technologies to collect and store information when you visit our Platform. These help customize your experience and support analytics, advertising, and security. You can disable cookies in your browser settings, but some features may not function properly.
          </p>
        </section>

        {/* Use of Information */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Use of Information</h2>
          <p className="leading-relaxed">
            Your personal data is used for service provision, order processing, enabling payments, resolving disputes, fraud prevention, marketing (with opt-out provisions), customer support, compliance with law, and to improve the Platform. Data may be processed and analyzed for aggregate insights and statistical measurement.
          </p>
        </section>

        {/* Sharing of Information */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Sharing & Disclosure</h2>
          <p className="leading-relaxed">
            We may share your information within our corporate group, with service providers (payment processors, delivery partners, analytics providers), and with regulatory or law enforcement authorities when required by law or legal process. Data shared with third parties is limited to what is necessary for service fulfillment, compliance, and security. We do not sell your data to unrelated third parties for marketing.
          </p>
        </section>

        {/* Data Security */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Security</h2>
          <p className="leading-relaxed">
            We employ industry-standard security practices to safeguard your data against unauthorized access, loss, or misuse, but no system can guarantee perfect security. You are responsible for keeping your account credentials safe.
          </p>
        </section>

        {/* User Rights */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Your Rights</h2>
          <p className="leading-relaxed">
            You have the right to access, update, rectify, or erase your personal information from our records. For account deletion, you can request via your profile settings or contact us directly (see below). Certain circumstances, such as unresolved grievances or legal obligations, may delay deletion.
          </p>
        </section>

        {/* Consent & Changes */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Consent & Policy Updates</h2>
          <p className="leading-relaxed">
            By using the Platform, you grant us consent for data collection, use, and disclosure as described herein. You may withdraw consent at any time by contacting our Grievance Officer; however, withdrawal may affect your access to services. We reserve the right to amend this Privacy Policy. Please check this page periodically for updates.
          </p>
        </section>

        {/* Links to Other Sites */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Third Party Links</h2>
          <p className="leading-relaxed">
            Our Platform may link to external websites. We are not responsible for their privacy practices. Please read the privacy policies of external sites before providing any personal information.
          </p>
        </section>

        {/* Contact/Grievance Officer */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">
            Contact & Grievance Redressal
          </h2>
          <p className="leading-relaxed">
            For complaints, data access requests, or questions about this Policy, contact our Grievance Officer:<br />
            <strong>Ducoart Data Protection / Grievance Officer</strong><br />
            Ducoart<br />
            Address: LIG-64, Avanti Vihar, Shadija Compound, Raipur (C.G), India, 492007<br />
            Phone (Primary / Mobile): +91 99932 40022<br />
            Office Phone: +91 98272 45678<br />
            Email: <a href="mailto:ducoart1@gmail.com" className="text-blue-400 underline">ducoart1@gmail.com</a>
          </p>
          <p className="leading-relaxed">
            Owner Name: Ducoart<br />
            Contact: +91 99932 40022<br />
            Email: <a href="mailto:ducoart1@gmail.com" className="text-blue-400 underline">ducoart1@gmail.com</a>
          </p>
        </section>

        {/* Legal */}
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-white">Governing Law</h2>
          <p className="leading-relaxed">
            This Privacy Policy and any disputes are governed by the laws of India. Jurisdiction for disputes lies exclusively in Raipur, Chhattisgarh, India.
          </p>
        </section>
      </div>
    </div>
  );
}
