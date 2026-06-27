import Layout from "@/components/Layout";
import { Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const FeedbackPage = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Thank you!", description: "Your feedback helps us improve." });
      setRating(0);
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ThumbsUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feedback</h1>
            <p className="text-muted-foreground">Help us make Skill-Connect better</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 border rounded-xl p-8 bg-card">
          <div className="space-y-3">
            <Label>How would you rate your experience?</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={`h-8 w-8 ${(hover || rating) >= n ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="what-like">What do you like about Skill-Connect?</Label>
            <Textarea id="what-like" placeholder="Tell us what's working well..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="what-improve">What can we improve?</Label>
            <Textarea id="what-improve" placeholder="Share your suggestions..." rows={3} required />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default FeedbackPage;
