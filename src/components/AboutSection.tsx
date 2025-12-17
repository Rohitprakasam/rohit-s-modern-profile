import { usePortfolioData } from "@/hooks/usePortfolioData";

const AboutSection = () => {
    const portfolioData = usePortfolioData();
    return (
        <section id="about" className="py-20 bg-background relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 animate-fade-in-up">
                        {portfolioData.aboutMe.title}
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed animate-fade-in-up [animation-delay:0.2s]">
                        {portfolioData.aboutMe.description}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
