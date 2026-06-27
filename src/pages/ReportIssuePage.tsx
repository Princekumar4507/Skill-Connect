import Layout from "@/components/Layout";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const ReportIssuePage = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Report submitted!", description: "We'll review it and take appropriate action." });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Report an Issue</h1>
            <p className="text-muted-foreground">Help us keep Skill-Connect safe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 border rounded-xl p-8 bg-card">
          <div className="space-y-2">
            <Label>Issue Type</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug / Technical Issue</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="harassment">Harassment / Bullying</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="impersonation">Impersonation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Brief description of the issue" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Please provide as much detail as possible..." rows={5} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Related URL (optional)</Label>
            <Input id="url" placeholder="Link to the content or page" />
          </div>

          <Button type="submit" className="w-full" variant="destructive" disabled={loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default ReportIssuePage;
