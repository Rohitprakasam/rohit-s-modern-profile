import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Calendar, MapPin } from "lucide-react";

const ExperienceSection = () => {
    const portfolioData = usePortfolioData();
    return (
        <section id="experience" className="py-20 bg-muted/30 relative">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-20 animate-fade-in-up">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Internships</span>
                </h2>

                <div className="max-w-4xl mx-auto space-y-16">
                    {portfolioData.experience.map((exp, index) => (
                        <div
                            key={index}
                            className="relative pl-8 md:pl-0 animate-fade-in-up group"
                            style={{ animationDelay: `${index * 0.2}s` }}
                        >
                            <div className="md:flex items-start gap-10">
                                {/* Timeline line */}
                                <div className="hidden md:block absolute left-1/2 top-0 bottom-[-4rem] w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent -ml-px"></div>

                                {/* Timeline Icon */}
                                <div className="absolute left-[-11px] md:left-1/2 md:-ml-[11px] w-[22px] h-[22px] rounded-full bg-black border-4 border-primary z-10 shadow-[0_0_20px_rgba(234,88,12,0.6)] group-hover:scale-125 transition-transform duration-500"></div>

                                {/* Content */}
                                <div className={`md:w-1/2 ${index % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:ml-auto md:pl-16'}`}>
                                    <div className="bg-black/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-primary/40 transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 relative overflow-hidden">

                                        {/* Card Content */}
                                        <h3 className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{exp.role}</h3>
                                        <div className={`flex flex-col gap-1 mb-4 ${index % 2 === 0 ? 'md:items-end' : ''}`}>
                                            <p className="text-xl font-medium text-white/80">{exp.organization}</p>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono mt-1">
                                                <span className="flex items-center gap-1"><Calendar size={14} /> {exp.duration}</span>
                                                <span className="flex items-center gap-1"><MapPin size={14} /> {exp.location}</span>
                                            </div>
                                        </div>

                                        <ul className={`space-y-3 text-muted-foreground text-sm/relaxed ${index % 2 === 0 ? 'md:text-right' : ''}`}>
                                            {exp.highlights.map((highlight, hIdx) => (
                                                <li key={hIdx} className="hover:text-foreground transition-colors">
                                                    {highlight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ExperienceSection;
