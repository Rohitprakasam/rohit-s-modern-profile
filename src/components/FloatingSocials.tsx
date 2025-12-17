import { usePortfolioData } from "@/hooks/usePortfolioData";
import { MessageCircle, Instagram } from "lucide-react";

const FloatingSocials = () => {
    // Hardcoded for immediate reliability per user request
    const whatsappUrl = "https://wa.me/+917397685577";
    const instagramUrl = "https://www.instagram.com/rp__vibes?igsh=M2Jza3g1bmg5YzRu";

    return (
        <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
            {/* WhatsApp - Priority 1 */}
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 hover:shadow-[#25D366]/50 flex items-center justify-center animate-fade-in-up"
                title="Chat on WhatsApp"
                style={{ animationDelay: '0.5s' }}
            >
                <MessageCircle size={28} />
            </a>

            {/* Instagram - Priority 2 */}
            <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#E1306C] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 hover:shadow-[#E1306C]/50 flex items-center justify-center animate-fade-in-up"
                title="Follow on Instagram"
                style={{ animationDelay: '0.6s' }}
            >
                <Instagram size={28} />
            </a>
        </div>
    );
};

export default FloatingSocials;
