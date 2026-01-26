import { FaWhatsapp } from "react-icons/fa";

const WhatsAppButton = () => {
  const phoneNumber = "919827245678"; // Client WhatsApp number (+91 98272 45678)

  return (
    <a
      href={`https://wa.me/${phoneNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 left-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg transition-all duration-200"
      title="Chat with us on WhatsApp"
    >
      <FaWhatsapp className="text-white text-3xl" />
    </a>
  );
};

export default WhatsAppButton;
