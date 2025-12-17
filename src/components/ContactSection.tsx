import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Mail, Phone, Linkedin, Github, Instagram, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ContactSection = () => {
    const portfolioData = usePortfolioData();
    const { contact } = portfolioData;
    const [formData, setFormData] = useState({ name: "", email: "", message: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Save to LocalStorage (Instant Backup)
        const newMessage = {
            id: Date.now().toString(),
            ...formData,
            date: new Date().toLocaleString()
        };
        const existingMessages = JSON.parse(localStorage.getItem("contactMessages") || "[]");
        localStorage.setItem("contactMessages", JSON.stringify([newMessage, ...existingMessages]));

        // 2. Send to GitHub via Vercel Function
        const promise = fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        }).then(async (res) => {
            if (!res.ok) throw new Error("Failed to send to GitHub");
            return res.json();
        });

        toast.promise(promise, {
            loading: "Sending message...",
            success: "Message sent! (Saved to GitHub Issues)",
            error: "Saved locally (GitHub sync failed)",
        });

        setFormData({ name: "", email: "", message: "" });
    };

    return (
        <section id="contact" className="py-20 bg-black/40 relative">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-16 animate-fade-in-up">
                    Contact <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Me</span>
                </h2>

                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
                    {/* Direct Contact Info */}
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex items-center gap-4 group">
                            <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:bg-primary group-hover:text-black transition-all duration-300">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Email</h3>
                                <a href={`mailto:${contact.email}`} className="text-lg md:text-xl font-semibold text-foreground hover:text-primary transition-colors">
                                    {contact.email}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:bg-primary group-hover:text-black transition-all duration-300">
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Phone</h3>
                                <a href={`tel:${contact.phone}`} className="text-lg md:text-xl font-semibold text-foreground hover:text-primary transition-colors">
                                    {contact.phone}
                                </a>
                            </div>
                        </div>

                        {/* Social Links Grid */}
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/10 transition-all duration-300 group">
                                <Linkedin className="w-8 h-8 text-foreground group-hover:text-[#0077b5] transition-colors mb-3" />
                                <span className="text-sm font-medium">LinkedIn</span>
                            </a>
                            <a href={contact.github} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/10 transition-all duration-300 group">
                                <Github className="w-8 h-8 text-foreground group-hover:text-white transition-colors mb-3" />
                                <span className="text-sm font-medium">GitHub</span>
                            </a>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-fade-in-up [animation-delay:0.2s]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <Input
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="bg-black/20 border-white/10 focus:border-primary/50"
                                />
                            </div>
                            <div>
                                <Input
                                    type="email"
                                    placeholder="Your Email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="bg-black/20 border-white/10 focus:border-primary/50"
                                />
                            </div>
                            <div>
                                <Textarea
                                    placeholder="Your Message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                    className="min-h-[150px] bg-black/20 border-white/10 focus:border-primary/50"
                                />
                            </div>
                            <Button type="submit" className="w-full gap-2 group">
                                Send Message
                                <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
