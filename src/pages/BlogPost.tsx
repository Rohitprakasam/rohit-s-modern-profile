
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portfolioData, Post, Comment } from "@/data/portfolio";
import Header from "@/components/Header";
import CommentSection from "@/components/blog/CommentSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Calendar, Share2, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const BlogPost = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem("portfolioData");
        let allPosts = portfolioData.posts || [];

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.posts) {
                    allPosts = parsed.posts;
                }
            } catch (e) {
                console.error(e);
            }
        }

        const found = allPosts.find(p => p.id === id);
        setPost(found || null);
        setLoading(false);
    }, [id]);

    const handleAddComment = (text: string) => {
        if (!post) return;

        const newComment: Comment = {
            id: Date.now().toString(),
            user: "Guest User", // In a real app, this would be the logged-in user
            avatar: "",
            text,
            date: "Just now",
            replies: []
        };

        const updatedPost = { ...post, comments: [newComment, ...post.comments] };
        setPost(updatedPost);

        // Update local storage
        try {
            const saved = localStorage.getItem("portfolioData");
            let data = saved ? JSON.parse(saved) : { ...portfolioData };

            // Ensure posts array exists in data structure beacuse we might correspond to "portfolioData" fallback
            if (!data.posts) data.posts = portfolioData.posts || [];

            const postIndex = data.posts.findIndex((p: Post) => p.id === post.id);
            if (postIndex >= 0) {
                data.posts[postIndex] = updatedPost;
            } else {
                // If for some reason it's not found in the source array but we rendered it, something is odd.
                // But let's safely ignore or add it.
            }

            localStorage.setItem("portfolioData", JSON.stringify(data));
            toast.success("Comment posted!");
        } catch (e) {
            toast.error("Failed to save comment.");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!post) return <div className="min-h-screen flex items-center justify-center">Post not found</div>;

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Header />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-3xl mx-auto"
                >
                    <Button variant="ghost" className="mb-8 gap-2 pl-0 hover:pl-2 transition-all" onClick={() => navigate("/blog")}>
                        <ArrowLeft size={20} /> Back to Blog
                    </Button>

                    <div className="space-y-6 mb-10">
                        <div className="flex gap-2 mb-4">
                            {post.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-primary bg-primary/10 hover:bg-primary/20">{tag}</Badge>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">{post.title}</h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">{post.subtitle}</p>

                        <div className="flex items-center justify-between py-6 border-y border-border/40">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12 border-2 border-primary/20">
                                    <AvatarImage src={post.author.avatar} />
                                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold">{post.author.name}</div>
                                    <div className="text-sm text-muted-foreground flex gap-4">
                                        <span className="flex items-center gap-1"><Calendar size={14} /> {post.date}</span>
                                        <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <Share2 size={18} />
                                </Button>
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <Heart size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl mb-12 shadow-2xl shadow-primary/5">
                        <img src={post.image} alt={post.title} className="object-cover w-full h-full" />
                    </div>

                    <article className="prose prose-invert prose-lg max-w-none mb-16 prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-blockquote:border-primary">
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    </article>

                    <div className="border-t border-border/40 pt-10">
                        <CommentSection comments={post.comments} onAddComment={handleAddComment} />
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default BlogPost;
