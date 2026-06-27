import Layout from "@/components/Layout";
import { Lock } from "lucide-react";

const sections = [
  { title: "Information We Collect", content: "We collect information you provide directly, such as your name, email, college, skills, and profile details. We also collect usage data like pages visited and features used to improve your experience." },
  { title: "How We Use Your Information", content: "Your information is used to provide and improve our services, personalize your experience, facilitate connections with other students, send notifications, and ensure platform security." },
  { title: "Information Sharing", content: "We do not sell your personal information. Your profile information is visible to other authenticated users as per your privacy settings. We may share data with service providers who help us operate the platform." },
  { title: "Data Security", content: "We implement industry-standard security measures to protect your data, including encryption, secure connections, and regular security audits." },
  { title: "Your Rights", content: "You have the right to access, update, or delete your personal information at any time through your profile settings. You can also request a copy of your data or ask us to stop processing it." },
  { title: "Cookies & Analytics", content: "We use essential cookies for authentication and session management. Analytics data is collected anonymously to improve platform performance and user experience." },
  { title: "Third-Party Services", content: "Our platform may contain links to third-party services. We are not responsible for the privacy practices of these external services." },
  { title: "Changes to This Policy", content: "We may update this privacy policy from time to time. We will notify you of significant changes via email or platform notification." },
];

const PrivacyPolicyPage = () => (
  <Layout>
    <div className="container max-w-3xl py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">How we handle your data</p>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={i}>
            <h2 className="text-xl font-semibold text-foreground mb-2">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-8 border-t pt-6">
        Last updated: March 2026. If you have questions about this policy, please contact us through the Contact page.
      </p>
    </div>
  </Layout>
);

export default PrivacyPolicyPage;
