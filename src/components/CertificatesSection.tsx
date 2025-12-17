import { useState } from 'react';
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Award, FileText, ImageIcon, Link as LinkIcon, ExternalLink } from "lucide-react";

const CertificatesSection = () => {
    const portfolioData = usePortfolioData();

    const getIcon = (type: string) => {
        switch (type) {
            case 'pdf': return FileText;
            case 'image': return ImageIcon;
            default: return Award;
        }
    };

    return (
        <section id="certificates" className="py-20 bg-muted/30 relative">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-16 animate-fade-in-up">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Certifications</span>
                </h2>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {portfolioData.certifications.map((cert: any, index: number) => {
                        const Icon = getIcon(cert.type);
                        const hasMedia = cert.url && cert.url !== '#';
                        const isImage = cert.type === 'image' || (hasMedia && cert.url.startsWith('data:image'));

                        return (
                            <div
                                key={index}
                                className="group"
                            >
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-colors duration-300 h-full flex flex-col">
                                    {/* Inline Media Preview */}
                                    {hasMedia && (
                                        <div className="h-64 w-full bg-black/50 border-b border-white/10 overflow-hidden relative">
                                            {/* Transparent Overlay to block interaction/scrolling */}
                                            <div className="absolute inset-0 z-10 bg-transparent" />

                                            {isImage ? (
                                                <img
                                                    src={cert.url}
                                                    alt={cert.title}
                                                    className="w-full h-full object-fill"
                                                />
                                            ) : (
                                                <iframe
                                                    src={`${cert.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                                    className="w-full h-full border-none overflow-hidden scrollbar-none"
                                                    title={`${cert.title} Preview`}
                                                    scrolling="no"
                                                />
                                            )}
                                        </div>
                                    )}

                                    <div className="p-6 flex items-start gap-4 flex-1">
                                        <div className="bg-primary/10 p-3 rounded-full text-primary group-hover:bg-primary group-hover:text-black transition-colors duration-300 shrink-0">
                                            <Icon size={24} />
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                                                {cert.title}
                                            </h3>

                                            {hasMedia && (
                                                <a
                                                    href={cert.url}
                                                    download={cert.title}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider font-medium border border-white/10 px-3 py-1.5 rounded hover:border-primary/30 bg-white/5"
                                                >
                                                    Download <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default CertificatesSection;
