import { Instagram, Linkedin, MessageCircle, Shield } from "lucide-react";
import profileImage from "@/assets/profile.jpg";

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: MessageCircle, href: "#", label: "WhatsApp" },
  { icon: Shield, href: "#", label: "TryHackMe" },
];

const HeroSection = () => {
  return (
    <section
      id="home"
      className="min-h-screen bg-diagonal-dark pt-24 pb-12 flex items-center relative overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/3 rounded-full blur-2xl" />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <p className="text-muted-foreground text-lg mb-2 animate-fade-in-up">
              Hi I am
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in-up [animation-delay:0.1s]">
              Rohit Prakasam
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-8 animate-fade-in-up [animation-delay:0.2s]">
              System Administrator
            </h2>

            {/* Social Icons */}
            <div className="flex justify-center lg:justify-start gap-4 mb-8 animate-fade-in-up [animation-delay:0.3s]">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground transition-all duration-300 hover:border-primary hover:text-primary hover:scale-110"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 animate-fade-in-up [animation-delay:0.4s]">
              <a
                href="#contact"
                className="px-8 py-3 bg-primary text-primary-foreground rounded-md font-medium transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:scale-105"
              >
                Hire Me
              </a>
              <a
                href="#"
                className="px-8 py-3 border border-border text-muted-foreground rounded-md font-medium transition-all duration-300 hover:border-primary hover:text-primary"
              >
                Download CV
              </a>
            </div>
          </div>

          {/* Right Content - Profile Image */}
          <div className="order-1 lg:order-2 flex justify-center animate-scale-in [animation-delay:0.2s]">
            <div className="relative">
              {/* Background circle */}
              <div className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-muted to-secondary left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              
              {/* Outer glow ring */}
              <div className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full border border-border/50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              
              {/* Profile image */}
              <div className="relative w-72 h-80 md:w-80 md:h-96 overflow-hidden">
                <img
                  src={profileImage}
                  alt="Rohit Prakasam - System Administrator"
                  className="w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
