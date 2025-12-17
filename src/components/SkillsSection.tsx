import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Badge } from "@/components/ui/badge";

const SkillsSection = () => {
    const portfolioData = usePortfolioData();
    return (
        <section id="skills" className="py-20 bg-background relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[30rem] h-[30rem] bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>
                <div className="absolute bottom-[20%] left-[10%] w-[20rem] h-[20rem] bg-secondary/5 rounded-full blur-[80px] -z-10 animate-pulse-slow [animation-delay:1s]"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-16 animate-fade-in-up">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Skills</span> & Interests
                </h2>

                <div className="grid md:grid-cols-2 gap-8">
                    {portfolioData.skills.map((skillGroup, index) => (
                        <div
                            key={index}
                            className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(234,88,12,0.3)] transition-all duration-500 group animate-fade-in-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-transparent rounded-full group-hover:h-12 transition-all duration-500"></span>
                                {skillGroup.category}
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {skillGroup.items.map((skill, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className="bg-white/5 text-primary/90 border-white/10 hover:bg-primary hover:text-black hover:border-primary transition-all duration-300 cursor-target px-4 py-2 text-sm font-medium"
                                    >
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SkillsSection;
