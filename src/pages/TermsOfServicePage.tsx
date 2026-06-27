import Layout from "@/components/Layout";
import { FileText } from "lucide-react";

const sections = [
  { title: "Acceptance of Terms", content: "By accessing or using Skill-Connect, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform." },
  { title: "Eligibility", content: "You must be at least 16 years old and currently enrolled in or affiliated with an educational institution to use Skill-Connect." },
  { title: "User Accounts", content: "You are responsible for maintaining the security of your account credentials. You must provide accurate information during registration and keep your profile updated." },
  { title: "Acceptable Use", content: "You agree to use Skill-Connect only for lawful purposes and in accordance with our Community Guidelines. You may not use the platform to harass, spam, or deceive other users." },
  { title: "Content Ownership", content: "You retain ownership of content you post on Skill-Connect. By posting, you grant us a non-exclusive license to display and distribute your content on the platform." },
  { title: "Intellectual Property", content: "The Skill-Connect platform, including its design, logos, and features, is our intellectual property. You may not copy, modify, or distribute any part of the platform without permission." },
  { title: "Termination", content: "We reserve the right to suspend or terminate your account if you violate these terms or our Community Guidelines. You may also delete your account at any time." },
  { title: "Limitation of Liability", content: "Skill-Connect is provided 'as is' without warranties. We are not liable for any damages arising from your use of the platform." },
];

const TermsOfServicePage = () => (
  <Layout>
    <div className="container max-w-3xl py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground">Rules and conditions for using Skill-Connect</p>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={i}>
            <h2 className="text-xl font-semibold text-foreground mb-2">{i + 1}. {s.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-8 border-t pt-6">
        Last updated: March 2026. Continued use of the platform after changes constitutes acceptance of the revised terms.
      </p>
    </div>
  </Layout>
);

export default TermsOfServicePage;
