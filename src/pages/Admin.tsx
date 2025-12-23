
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Save, Download, LogOut, Plus, Trash2, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePortfolio } from "@/hooks/usePortfolioData";
import { useQueryClient } from "@tanstack/react-query";

const Admin = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");

    // We maintain a local "draft" state that starts with the fetched data
    const { data: fetchedData, isLoading } = usePortfolio() as any; // Cast for now
    const [data, setData] = useState<any>(null);

    const [messages, setMessages] = useState<any[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const queryClient = useQueryClient();

    // Load initial data only when fully loaded AND not already set
    useEffect(() => {
        if (!data && fetchedData && !isLoading && fetchedData.siteMeta) {
            setData(fetchedData);
        }
    }, [fetchedData, isLoading, data]);

    // Load messages separately
    useEffect(() => {
        if (isAuthenticated) {
            fetch("/api/crud?collection=messages")
                .then(res => res.json())
                .then(msgs => setMessages(msgs))
                .catch(err => console.error("Failed to fetch messages", err));
        }
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setIsAuthenticated(true);
                toast.success("Welcome back, Admin!");
            } else {
                toast.error("Invalid credentials");
            }
        } catch (error) {
            toast.error("Login failed. Check connection.");
        }
    };

    const handleSave = async () => {
        if (!data) return;
        setIsPublishing(true);
        toast.info("Saving changes...");

        try {
            // Parallel requests to update all collections
            // For Profile (Hero, About, etc.)
            const profilePayload = {
                siteMeta: data.siteMeta,
                heroSection: data.heroSection,
                aboutMe: data.aboutMe,
                contact: data.contact,
                interests: data.interests
            };

            await Promise.all([
                fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profilePayload) }),
                fetch("/api/crud?collection=skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.skills || []) }),
                fetch("/api/crud?collection=projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.projects || []) }),
                fetch("/api/crud?collection=experience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.experience || []) }),
                fetch("/api/crud?collection=education", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.education || []) }),
                fetch("/api/crud?collection=certifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.certifications || []) }),
                fetch("/api/crud?collection=posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.posts || []) })
            ]);

            toast.success("All changes saved to database!");
            queryClient.invalidateQueries(); // Refresh data
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save changes: " + e.message);
        } finally {
            setIsPublishing(false);
        }
    };

    // We removed 'handlePublish' logic as saving to DB handles the "dynamic" requirement. 
    // The previous 'Publish Changes' button logic triggered a GH workflow, which is less relevant for dynamic content.
    // We can keep a "Deploy" button if users want to redeploy code, but for content, "Save" is enough.

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "portfolio.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success("Configuration downloaded");
    };

    const updateHero = (field: string, value: string) => {
        setData((prev: any) => ({
            ...prev,
            heroSection: { ...prev.heroSection, [field]: value }
        }));
    };

    const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                toast.warning("File is large. Database might reject > 4MB.");
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                let type = 'other';
                if (file.type.includes('pdf')) type = 'pdf';
                else if (file.type.includes('image')) type = 'image';

                const newCerts = [...data.certifications];
                newCerts[index] = { ...newCerts[index], url: base64String, type: type };
                setData((prev: any) => ({ ...prev, certifications: newCerts }));
                toast.success("File uploaded successfully");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteMessage = async (id: string, _id?: string) => {
        // Optimistic update
        const originalMessages = messages;
        setMessages(messages.filter(m => m.id !== id));

        try {
            // Try deleting by mongo _id if available, else standard id (which might be mongo id string)
            const targetId = _id || id;
            await fetch(`/api/crud?collection=messages&id=${targetId}`, { method: 'DELETE' });
            toast.success("Message deleted");
        } catch (e) {
            toast.error("Failed to delete message");
            setMessages(originalMessages);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md border-primary/20 bg-black/40 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
                            <Lock className="w-6 h-6 text-primary" />
                            Admin Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Enter access code"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-background/50 border-white/10"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                Unlock Dashboard
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) return <div className="min-h-screen flex items-center justify-center">Loading Data...</div>;

    const certifications = data.certifications || [];

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/40 bg-black/20 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl text-primary">Portfolio Admin</div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 hidden md:flex">
                            <Download className="w-4 h-4" /> Export JSON
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isPublishing} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isPublishing ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsAuthenticated(false)}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <Tabs defaultValue="hero" className="w-full">
                    <TabsList className="flex flex-wrap w-full bg-muted/20 mb-6">
                        <TabsTrigger value="hero" className="flex-1">Hero</TabsTrigger>
                        <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
                        <TabsTrigger value="skills" className="flex-1">Skills</TabsTrigger>
                        <TabsTrigger value="internships" className="flex-1">Internships</TabsTrigger>
                        <TabsTrigger value="projects" className="flex-1">Projects</TabsTrigger>
                        <TabsTrigger value="certificates" className="flex-1">Certifications</TabsTrigger>
                        <TabsTrigger value="blog" className="flex-1">Blog</TabsTrigger>
                        <TabsTrigger value="messages" className="flex-1">Messages ({messages.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hero" className="space-y-6">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader>
                                <CardTitle>Hero Section</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Greeting</label>
                                        <Input
                                            value={data.heroSection.greeting}
                                            onChange={(e) => updateHero('greeting', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Full Name</label>
                                        <Input
                                            value={data.heroSection.fullName}
                                            onChange={(e) => updateHero('fullName', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Designation</label>
                                    <Input
                                        value={data.heroSection.designation}
                                        onChange={(e) => updateHero('designation', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tagline</label>
                                    <Input
                                        value={data.heroSection.tagline}
                                        onChange={(e) => updateHero('tagline', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="about">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader>
                                <CardTitle>About Section</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Textarea
                                        value={data.aboutMe.description}
                                        onChange={(e) => setData((prev: any) => ({
                                            ...prev,
                                            aboutMe: { ...prev.aboutMe, description: e.target.value }
                                        }))}
                                        className="min-h-[150px]"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="skills">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                {(data.skills || []).map((skillGroup: any, idx: number) => (
                                    <div key={idx} className="p-4 border border-white/10 rounded bg-black/20 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Category Name</label>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newSkills = data.skills.filter((_: any, i: number) => i !== idx);
                                                setData((prev: any) => ({ ...prev, skills: newSkills }));
                                            }} className="text-destructive hover:text-destructive/80">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                        <Input
                                            value={skillGroup.category}
                                            onChange={(e) => {
                                                const newSkills = [...data.skills];
                                                newSkills[idx] = { ...newSkills[idx], category: e.target.value };
                                                setData((prev: any) => ({ ...prev, skills: newSkills }));
                                            }}
                                            placeholder="Category (e.g., Frontend)"
                                        />

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Skills (comma separated)</label>
                                            <Textarea
                                                value={skillGroup.items.join(", ")}
                                                onChange={(e) => {
                                                    const newSkills = [...data.skills];
                                                    newSkills[idx] = {
                                                        ...newSkills[idx],
                                                        items: e.target.value.split(",").map((s: string) => s.trim()).filter((s: string) => s)
                                                    };
                                                    setData((prev: any) => ({ ...prev, skills: newSkills }));
                                                }}
                                                placeholder="React, TypeScript, Tailwind..."
                                                className="min-h-[80px]"
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full gap-2" onClick={() => {
                                    setData((prev: any) => ({ ...prev, skills: [...(prev.skills || []), { category: "New Category", items: [] }] }));
                                }}>
                                    <Plus size={16} /> Add Skill Category
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="internships">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader><CardTitle>Internships</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                {(data.experience || []).map((exp: any, idx: number) => (
                                    <div key={idx} className="p-4 border border-white/10 rounded bg-black/20 space-y-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-muted-foreground">Internship #{idx + 1}</span>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newExp = data.experience.filter((_: any, i: number) => i !== idx);
                                                setData((prev: any) => ({ ...prev, experience: newExp }));
                                            }} className="text-destructive hover:text-destructive/80">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Role</label>
                                                <Input
                                                    value={exp.role}
                                                    onChange={(e) => {
                                                        const newExp = [...data.experience];
                                                        newExp[idx] = { ...newExp[idx], role: e.target.value };
                                                        setData((prev: any) => ({ ...prev, experience: newExp }));
                                                    }}
                                                    placeholder="Role"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Organization</label>
                                                <Input
                                                    value={exp.organization}
                                                    onChange={(e) => {
                                                        const newExp = [...data.experience];
                                                        newExp[idx] = { ...newExp[idx], organization: e.target.value };
                                                        setData((prev: any) => ({ ...prev, experience: newExp }));
                                                    }}
                                                    placeholder="Organization"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Duration</label>
                                                <Input
                                                    value={exp.duration}
                                                    onChange={(e) => {
                                                        const newExp = [...data.experience];
                                                        newExp[idx] = { ...newExp[idx], duration: e.target.value };
                                                        setData((prev: any) => ({ ...prev, experience: newExp }));
                                                    }}
                                                    placeholder="Duration"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Location</label>
                                                <Input
                                                    value={exp.location}
                                                    onChange={(e) => {
                                                        const newExp = [...data.experience];
                                                        newExp[idx] = { ...newExp[idx], location: e.target.value };
                                                        setData((prev: any) => ({ ...prev, experience: newExp }));
                                                    }}
                                                    placeholder="Location"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Highlights (one per line)</label>
                                            <Textarea
                                                value={exp.highlights.join("\n")}
                                                onChange={(e) => {
                                                    const newExp = [...data.experience];
                                                    newExp[idx] = {
                                                        ...newExp[idx],
                                                        highlights: e.target.value.split("\n").filter((line: string) => line.trim())
                                                    };
                                                    setData((prev: any) => ({ ...prev, experience: newExp }));
                                                }}
                                                className="min-h-[100px]"
                                                placeholder="- Achieved X..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full gap-2" onClick={() => {
                                    setData((prev: any) => ({
                                        ...prev, experience: [...(prev.experience || []), {
                                            role: "New Role",
                                            organization: "Company",
                                            duration: "Jan 2024 - Present",
                                            location: "City",
                                            highlights: []
                                        }]
                                    }));
                                }}>
                                    <Plus size={16} /> Add Internship
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="projects">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                {(data.projects || []).map((proj: any, idx: number) => (
                                    <div key={idx} className="p-4 border border-white/10 rounded bg-black/20 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Project Title</label>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newProjects = data.projects.filter((_: any, i: number) => i !== idx);
                                                setData((prev: any) => ({ ...prev, projects: newProjects }));
                                            }} className="text-destructive hover:text-destructive/80">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                        <Input
                                            value={proj.title}
                                            onChange={(e) => {
                                                const newProjects = [...data.projects];
                                                newProjects[idx] = { ...newProjects[idx], title: e.target.value };
                                                setData((prev: any) => ({ ...prev, projects: newProjects }));
                                            }}
                                            placeholder="Project Title"
                                        />

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Textarea
                                                value={proj.description}
                                                onChange={(e) => {
                                                    const newProjects = [...data.projects];
                                                    newProjects[idx] = { ...newProjects[idx], description: e.target.value };
                                                    setData((prev: any) => ({ ...prev, projects: newProjects }));
                                                }}
                                                className="min-h-[100px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tags (comma separated)</label>
                                            <Input
                                                value={proj.tags.join(", ")}
                                                onChange={(e) => {
                                                    const newProjects = [...data.projects];
                                                    newProjects[idx] = {
                                                        ...newProjects[idx],
                                                        tags: e.target.value.split(",").map((s: string) => s.trim()).filter((s: string) => s)
                                                    };
                                                    setData((prev: any) => ({ ...prev, projects: newProjects }));
                                                }}
                                                placeholder="React, Demo, Web..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Project Link</label>
                                            <Input
                                                value={proj.link || ""}
                                                onChange={(e) => {
                                                    const newProjects = [...data.projects];
                                                    newProjects[idx] = { ...newProjects[idx], link: e.target.value };
                                                    setData((prev: any) => ({ ...prev, projects: newProjects }));
                                                }}
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full gap-2" onClick={() => {
                                    setData((prev: any) => ({ ...prev, projects: [...(prev.projects || []), { title: "New Project", description: "Description...", tags: [], status: "finished", link: "#" }] }));
                                }}>
                                    <Plus size={16} /> Add Project
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="certificates">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader>
                                <CardTitle>Certifications</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {certifications.map((cert: any, idx: number) => (
                                    <div key={idx} className="p-4 border border-white/10 rounded bg-black/20 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Certificate Title</label>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newCerts = certifications.filter((_: any, i: number) => i !== idx);
                                                setData((prev: any) => ({ ...prev, certifications: newCerts }));
                                            }} className="text-destructive hover:text-destructive/80">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                        <Input
                                            value={cert.title}
                                            onChange={(e) => {
                                                const newCerts = [...certifications];
                                                newCerts[idx] = { ...newCerts[idx], title: e.target.value };
                                                setData((prev: any) => ({ ...prev, certifications: newCerts }));
                                            }}
                                            placeholder="Certificate Title"
                                        />

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium block">Upload File (PDF/Image)</label>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="file"
                                                    accept=".pdf, .png, .jpg, .jpeg"
                                                    onChange={(e) => handleFileUpload(idx, e)}
                                                    className="cursor-pointer"
                                                />
                                                {cert.url && cert.url !== '#' && (
                                                    <div className="text-xs text-green-500 font-mono bg-green-500/10 px-2 py-1 rounded border border-green-500/20 whitespace-nowrap">
                                                        File Uploaded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full gap-2" onClick={() => {
                                    setData((prev: any) => ({ ...prev, certifications: [...(prev.certifications || []), { title: "New Certification", url: "#", type: "other" }] }));
                                }}>
                                    <Plus size={16} /> Add Certification
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="blog">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader><CardTitle>Blog Posts</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                {(data.posts || []).map((post: any, idx: number) => (
                                    <div key={idx} className="p-4 border border-white/10 rounded bg-black/20 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Post Title</label>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newPosts = data.posts.filter((_: any, i: number) => i !== idx);
                                                setData((prev: any) => ({ ...prev, posts: newPosts }));
                                            }} className="text-destructive hover:text-destructive/80">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                        <Input
                                            value={post.title}
                                            onChange={(e) => {
                                                const newPosts = [...data.posts];
                                                newPosts[idx] = { ...newPosts[idx], title: e.target.value };
                                                setData((prev: any) => ({ ...prev, posts: newPosts }));
                                            }}
                                            placeholder="Post Title"
                                        />

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Subtitle</label>
                                            <Input
                                                value={post.subtitle}
                                                onChange={(e) => {
                                                    const newPosts = [...data.posts];
                                                    newPosts[idx] = { ...newPosts[idx], subtitle: e.target.value };
                                                    setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                }}
                                                placeholder="Short hook..."
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Date</label>
                                                <Input
                                                    value={post.date}
                                                    onChange={(e) => {
                                                        const newPosts = [...data.posts];
                                                        newPosts[idx] = { ...newPosts[idx], date: e.target.value };
                                                        setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                    }}
                                                    placeholder="Dec 15, 2024"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Read Time</label>
                                                <Input
                                                    value={post.readTime}
                                                    onChange={(e) => {
                                                        const newPosts = [...data.posts];
                                                        newPosts[idx] = { ...newPosts[idx], readTime: e.target.value };
                                                        setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                    }}
                                                    placeholder="5 min read"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium block">Cover Image</label>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                const newPosts = [...data.posts];
                                                                newPosts[idx] = { ...newPosts[idx], image: reader.result as string };
                                                                setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                                toast.success("Image uploaded");
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                {post.image?.startsWith("data:") && (
                                                    <div className="text-xs text-green-500 font-mono bg-green-500/10 px-2 py-1 rounded border border-green-500/20 whitespace-nowrap">
                                                        Uploaded
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                value={post.image}
                                                onChange={(e) => {
                                                    const newPosts = [...data.posts];
                                                    newPosts[idx] = { ...newPosts[idx], image: e.target.value };
                                                    setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                }}
                                                placeholder="Or paste image URL"
                                                className="mt-2"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Content (HTML)</label>
                                            <Textarea
                                                value={post.content}
                                                onChange={(e) => {
                                                    const newPosts = [...data.posts];
                                                    newPosts[idx] = { ...newPosts[idx], content: e.target.value };
                                                    setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                }}
                                                className="min-h-[200px] font-mono text-xs"
                                                placeholder="<p>Write your content here...</p>"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tags (comma separated)</label>
                                            <Input
                                                value={post.tags.join(", ")}
                                                onChange={(e) => {
                                                    const newPosts = [...data.posts];
                                                    newPosts[idx] = {
                                                        ...newPosts[idx],
                                                        tags: e.target.value.split(",").map((s: string) => s.trim()).filter((s: string) => s)
                                                    };
                                                    setData((prev: any) => ({ ...prev, posts: newPosts }));
                                                }}
                                                placeholder="Cybersecurity, Tech..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full gap-2" onClick={() => {
                                    setData((prev: any) => ({
                                        ...prev, posts: [
                                            ...(prev.posts || []),
                                            {
                                                id: Date.now().toString(),
                                                title: "New Post",
                                                subtitle: "Subtitle",
                                                content: "<p>Content...</p>",
                                                image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
                                                author: {
                                                    name: "Rohit Prakasam",
                                                    avatar: "/profile.png",
                                                    role: "System Administrator"
                                                },
                                                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                                readTime: "5 min read",
                                                likes: 0,
                                                comments: [],
                                                tags: []
                                            }
                                        ]
                                    }));
                                }}>
                                    <Plus size={16} /> Add Blog Post
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="messages">
                        <Card className="bg-card/50 border-white/5">
                            <CardHeader><CardTitle>Contact Messages</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {messages.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No messages yet.</p>
                                ) : (
                                    messages.map((msg: any) => (
                                        <div key={msg._id || msg.id} className="p-4 border border-white/10 rounded bg-black/20 flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-lg">{msg.name}</h4>
                                                    <p className="text-sm text-primary">{msg.email}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(msg.date).toLocaleDateString()}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteMessage(msg.id, msg._id)} className="text-destructive hover:text-destructive/80">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                            <div className="mt-2 text-sm bg-white/5 p-3 rounded text-foreground/90 whitespace-pre-wrap">
                                                {msg.message}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
};

export default Admin;
