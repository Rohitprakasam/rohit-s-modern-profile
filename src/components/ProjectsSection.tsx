import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Terminal, CheckCircle2 } from "lucide-react";

const ProjectsSection = () => {
    const portfolioData = usePortfolioData();
    return (
        <section id="projects" className="py-20 bg-background relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-16 animate-fade-in-up">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Projects</span>
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {portfolioData.projects.map((project: any, index: number) => (
                        <a
                            href={project.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={index}
                            className="bg-card/20 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-[0_10px_50px_-20px_rgba(234,88,12,0.3)] hover:-translate-y-2 transition-all duration-500 group cursor-pointer flex flex-col animate-fade-in-up block"
                            style={{ animationDelay: `${index * 0.15}s` }}
                        >
                            <div className="h-2 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary group-hover:text-black transition-colors duration-300">
                                        <Terminal size={24} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors flex items-center gap-2">
                                    {project.title}
                                    <ExternalLink className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                </h3>

                                <p className="text-muted-foreground text-sm mb-6 leading-relaxed flex-1">
                                    {project.description}
                                </p>

                                <div className="flex flex-wrap gap-2 mt-auto pt-6 border-t border-white/5">
                                    {project.tags.map((tag: string, tIdx: number) => (
                                        <Badge key={tIdx} variant="outline" className="bg-black/20 border-white/10 text-muted-foreground text-xs px-2.5 py-1 group-hover:border-primary/30 group-hover:text-primary/90 transition-colors">
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProjectsSection;
