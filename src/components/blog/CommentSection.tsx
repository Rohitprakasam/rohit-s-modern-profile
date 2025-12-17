
import { useState } from "react";
import { Comment } from "@/data/portfolio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ThumbsUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface CommentSectionProps {
    comments: Comment[];
    onAddComment: (text: string) => void;
}

const CommentSection = ({ comments, onAddComment }: CommentSectionProps) => {
    const [newComment, setNewComment] = useState("");

    const handleSubmit = () => {
        if (!newComment.trim()) return;
        onAddComment(newComment);
        setNewComment("");
        toast.success("Comment posted successfully!");
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold">Comments ({comments.length})</h3>

            {/* Input */}
            <div className="flex gap-4">
                <Avatar>
                    <AvatarFallback>ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                    <Textarea
                        placeholder="Add to the discussion..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[100px] bg-background/50"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleSubmit} disabled={!newComment.trim()} className="gap-2">
                            <Send size={16} /> Post
                        </Button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6 mt-8">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                        <Avatar>
                            <AvatarImage src={comment.avatar} />
                            <AvatarFallback>{comment.user[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{comment.user}</span>
                                <span className="text-xs text-muted-foreground">• {comment.date}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{comment.text}</p>

                            <div className="flex gap-4 mt-2">
                                <button className="text-muted-foreground hover:text-primary text-xs flex items-center gap-1 font-medium transition-colors">
                                    <ThumbsUp size={14} /> Like
                                </button>
                                <button className="text-muted-foreground hover:text-primary text-xs flex items-center gap-1 font-medium transition-colors">
                                    <MessageSquare size={14} /> Reply
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommentSection;
