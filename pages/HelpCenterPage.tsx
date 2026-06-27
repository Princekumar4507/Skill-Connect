import Layout from "@/components/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const faqs = [
  { q: "How do I create an account?", a: "Click the Sign In button on the top right corner and choose Sign Up. Fill in your details and verify your email to get started." },
  { q: "How do I connect with other students?", a: "Go to the Discover page to find students with similar interests. Click on their profile and send a connection request." },
  { q: "How do I join a community?", a: "Navigate to the Communities page, browse available communities, and click Join to become a member." },
  { q: "How do I create a post?", a: "Go to the Home page and use the post creation form at the top. You can add text, images, and tags to your post." },
  { q: "How do I update my profile?", a: "Click on your avatar in the top right corner and select Profile. You can edit your details, skills, and upload a profile picture." },
  { q: "How do I message someone?", a: "You need to be connected with someone first. Once connected, go to Messages and start a conversation." },
  { q: "How do I register for an event?", a: "Visit the Events page, find an event you're interested in, and click Register to sign up." },
  { q: "How do I report inappropriate content?", a: "Use the Report an Issue page from the footer to report any content that violates our community guidelines." },
];

const HelpCenterPage = () => {
  const [search, setSearch] = useState("");
  const filtered = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="container max-w-3xl py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
            <p className="text-muted-foreground">Find answers to common questions</p>
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search for help..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Accordion type="single" collapsible className="w-full">
          {filtered.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found. Try a different search term.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HelpCenterPage;
