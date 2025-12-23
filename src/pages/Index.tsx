import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import AboutSection from "@/components/AboutSection";
import SkillsSection from "@/components/SkillsSection";
import ExperienceSection from "@/components/ExperienceSection";
import CertificatesSection from "@/components/CertificatesSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import FloatingSocials from "@/components/FloatingSocials";

import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/hooks/usePortfolioData";

const Index = () => {
  const location = useLocation();
  const { isLoading, isError, queries } = usePortfolio() as any; // Cast to any to access queries

  // Find the specific error
  const queriesArray = Object.values(queries) as any[];
  const error = queriesArray.find(q => q.error)?.error as Error;

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace("#", ""));
      if (element) {
        setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-xl animate-pulse">Loading Portfolio...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="text-center space-y-4 max-w-md bg-card border border-destructive/20 p-8 rounded-xl">
          <p className="text-xl text-destructive font-bold">Error loading portfolio data</p>
          <p className="text-sm text-muted-foreground font-mono bg-black/20 p-2 rounded">
            {error?.message || "Unknown error occurred"}
          </p>
          <div className="text-xs text-left text-muted-foreground space-y-2">
            <p>Possible fixes:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Did you visit <code>/api/seed</code> to populate the database?</li>
              <li>Is <code>MONGODB_URI</code> set in Vercel Settings?</li>
              <li>Is MongoDB Network Access set to <code>0.0.0.0/0</code>?</li>
            </ul>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <SkillsSection />
        <ExperienceSection />
        <CertificatesSection />
        <ProjectsSection />
        <ContactSection />
      </main>
      <FloatingSocials />
    </div>
  );
};

export default Index;
