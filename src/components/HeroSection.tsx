import { useRef, useEffect } from "react";
import { Linkedin, Github, Mail, Instagram, MessageCircle } from "lucide-react";
import DecryptedText from "./DecryptedText";
import TargetCursor from "./TargetCursor";
import profileImage from "@/assets/profile.png";
import { usePortfolioData } from "@/hooks/usePortfolioData";

const HeroSection = () => {
  const containerRef = useRef(null);
  const portfolioData = usePortfolioData();
  const { heroSection } = portfolioData;

  useEffect(() => {
    const scriptUrl = "https://unpkg.com/@splinetool/viewer@1.12.17/build/spline-viewer.js";
    // Check if script already exists
    if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = scriptUrl;
      document.head.appendChild(script);
    }
  }, []);

  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return Linkedin;
      case 'github': return Github;
      case 'email': return Mail;
      case 'instagram': return Instagram;
      case 'whatsapp': return MessageCircle;
      default: return Mail;
    }
  };

  return (
    <section
      ref={containerRef}
      id="home"
      className="min-h-screen pt-24 pb-12 flex items-center relative overflow-hidden"
    >
      <TargetCursor />

      <div className="absolute inset-0 z-0 overflow-hidden">
        <spline-viewer
          id="spline"
          url="https://prod.spline.design/XLsvKcHnq31mMgRd/scene.splinecode"
          style={{
            width: '100%',
            height: '100%',
            transform: 'scale(2) translate(3.9%, -1%)',
            transformOrigin: 'center'
          }}
        />
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-1 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/3 rounded-full blur-2xl -z-10" />

      {/* Content Container */}
      <div className="container mx-auto px-6 relative z-10 pointer-events-none">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left pointer-events-auto">
            <p className="text-muted-foreground text-lg mb-2 animate-fade-in-up">
              {heroSection.greeting}
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in-up [animation-delay:0.1s]">
              {heroSection.fullName}
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-8 animate-fade-in-up [animation-delay:0.2s]">
              {heroSection.designation}
            </h2>

            {/* Social Icons */}
            <div className="flex justify-center lg:justify-start gap-4 mb-8 animate-fade-in-up [animation-delay:0.3s]">
              {heroSection.socialLinks.map((social) => {
                const Icon = getIcon(social.platform);
                return (
                  <a
                    key={social.platform}
                    href={social.url}
                    aria-label={social.platform}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-target w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground transition-all duration-300 hover:border-primary hover:text-primary hover:scale-110"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 animate-fade-in-up [animation-delay:0.4s]">
              {heroSection.ctaButtons.map((btn, idx) => {
                const isResume = btn.label === "Download CV";
                const actionUrl = isResume ? "/resume.pdf" : btn.action;

                return (
                  <a
                    key={idx}
                    href={actionUrl}
                    download={isResume ? "resume.pdf" : undefined}
                    className={`cursor-target px-8 py-3 rounded-md font-medium transition-all duration-300 hover:scale-105 ${idx === 0
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
                      : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                  >
                    {btn.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Right Content - Profile Image only */}
          <div className="order-1 lg:order-2 flex justify-center animate-scale-in [animation-delay:0.2s] pointer-events-auto">
            <div className="relative w-80 h-80 md:w-[500px] md:h-[500px]">
              {/* Profile image wrapper - anchors the badge */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-56 md:w-64 md:h-72 relative">
                <img
                  src={profileImage}
                  alt={`${heroSection.fullName} - ${heroSection.designation}`}
                  className="w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-all duration-500 rounded-lg shadow-2xl"
                />

                {/* Ethical Hacker Badge */}
                <div className="absolute bottom(-1) left-[5%] -translate-x-1/2 translate-y-1/2 w-max z-20 animate-fade-in-up [animation-delay:0.4s]">
                  <div className="cursor-target bg-black/90 backdrop-blur-md border border-primary text-primary px-8 py-2 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.4)] transform hover:scale-105 transition-transform duration-300">
                    <DecryptedText
                      text="ETHICAL HACKER"
                      speed={100}
                      maxIterations={20}
                      animateOn="view"
                      revealDirection="center"
                      className="font-bold tracking-[0.25em] uppercase text-sm md:text-base text-primary"
                      parentClassName="block"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
