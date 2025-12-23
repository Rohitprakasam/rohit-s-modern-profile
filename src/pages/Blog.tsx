import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Post } from "@/data/portfolio";
import PostCard from "@/components/blog/PostCard";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

const Blog = () => {
    const navigate = useNavigate();
    const portfolioData = usePortfolioData();
    const posts = (portfolioData.posts || []) as Post[]; // Explicit cast
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Removed manual loading from LS, usePortfolioData handles it via ReactQuery at root

    const filteredPosts = posts.filter((post: Post) => {
        // ... filtering logic matches existing ...
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;
        return matchesSearch && matchesTag;
    });

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Header />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto space-y-8"
                >
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            My Blog
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Thoughts on Cybersecurity, Linux, and Tech.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-xl backdrop-blur-sm border border-border/40">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search posts..."
                                className="pl-10 bg-background/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                            <Button
                                variant={selectedTag === null ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTag(null)}
                            >
                                All
                            </Button>
                            {allTags.map(tag => (
                                <Button
                                    key={tag}
                                    variant={selectedTag === tag ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedTag(tag)}
                                    className="whitespace-nowrap"
                                >
                                    {tag}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {filteredPosts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onClick={() => navigate(`/blog/${post.id}`)}
                            />
                        ))}
                    </div>

                    {filteredPosts.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            <p>No posts found matching your criteria.</p>
                            <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedTag(null) }}>
                                Clear filters
                            </Button>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default Blog;
