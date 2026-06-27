import Layout from "@/components/Layout";
import { Shield } from "lucide-react";

const guidelines = [
  { title: "Be Respectful", desc: "Treat everyone with respect. Harassment, bullying, and discrimination of any kind will not be tolerated." },
  { title: "Keep It Professional", desc: "Skill-Connect is a platform for learning and collaboration. Keep discussions relevant and constructive." },
  { title: "No Spam or Self-Promotion", desc: "Avoid excessive self-promotion, spam, or irrelevant content. Share resources that genuinely help others." },
  { title: "Protect Privacy", desc: "Do not share personal information of others without their consent. Respect everyone's privacy." },
  { title: "Original Content", desc: "Share original work or properly attribute content to its creators. Plagiarism is not tolerated." },
  { title: "Report Violations", desc: "If you see content that violates these guidelines, report it immediately using the Report an Issue page." },
  { title: "No Hate Speech", desc: "Content promoting hate, violence, or discrimination based on race, gender, religion, or any other characteristic is strictly prohibited." },
  { title: "Academic Integrity", desc: "Do not share exam answers, encourage cheating, or engage in any form of academic dishonesty." },
];

const CommunityGuidelinesPage = () => (
  <Layout>
    <div className="container max-w-3xl py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Community Guidelines</h1>
          <p className="text-muted-foreground">Standards for a safe and productive community</p>
        </div>
      </div>

      <div className="space-y-6">
        {guidelines.map((g, i) => (
          <div key={i} className="border rounded-xl p-6 bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-2">{i + 1}. {g.title}</h3>
            <p className="text-muted-foreground">{g.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Violation of these guidelines may result in content removal, account suspension, or permanent ban. Last updated: March 2026.
      </p>
    </div>
  </Layout>
);

export default CommunityGuidelinesPage;
