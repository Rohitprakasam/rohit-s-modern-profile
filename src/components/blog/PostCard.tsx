
import { Post } from "@/data/portfolio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { motion } from "framer-motion";

interface PostCardProps {
    post: Post;
    onClick: () => void;
}

const PostCard = ({ post, onClick }: PostCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
        >
            <Card
                className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                onClick={onClick}
            >
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                    <Avatar>
                        <AvatarImage src={post.author.avatar} alt={post.author.name} />
                        <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{post.author.name}</span>
                        <span className="text-xs text-muted-foreground">{post.author.role} • {post.date}</span>
                    </div>
                </CardHeader>

                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    <img
                        src={post.image}
                        alt={post.title}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                </div>

                <CardContent className="p-4 space-y-2">
                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.subtitle}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {post.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex justify-between items-center text-muted-foreground">
                    <div className="flex gap-4">
                        <Button variant="ghost" size="sm" className="gap-2 hover:text-red-500 hover:bg-red-500/10 px-2 pl-0">
                            <Heart className="w-5 h-5" />
                            <span className="text-xs">{post.likes}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 hover:text-blue-500 hover:bg-blue-500/10 px-2">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-xs">{post.comments.length}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 hover:text-green-500 hover:bg-green-500/10 px-2">
                            <Share2 className="w-5 h-5" />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="hover:text-yellow-500 hover:bg-yellow-500/10">
                        <Bookmark className="w-5 h-5" />
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

export default PostCard;
