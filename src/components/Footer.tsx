import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t bg-card/50 backdrop-blur-sm mt-12">
    <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <Link to="/" className="flex items-center gap-2 mb-3">
          <Logo size={28} />
          <span className="text-lg font-bold text-foreground">
            Skill<span className="gradient-text">-Connect</span>
          </span>
        </Link>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect, collaborate, and grow with students across colleges.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-3">Platform</h4>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/connections" className="hover:text-primary transition-colors">Connections</Link>
          <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
          <Link to="/communities" className="hover:text-primary transition-colors">Communities</Link>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-3">Resources</h4>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link to="/help-center" className="hover:text-primary transition-colors">Help Center</Link>
          <Link to="/community-guidelines" className="hover:text-primary transition-colors">Community Guidelines</Link>
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-3">Contact</h4>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
          <Link to="/feedback" className="hover:text-primary transition-colors">Feedback</Link>
          <Link to="/report-issue" className="hover:text-primary transition-colors">Report an Issue</Link>
        </div>
      </div>
    </div>
    <div className="border-t">
      <div className="container py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Skill-Connect. Made with ❤️ for students.
      </div>
    </div>
  </footer>
);

export default Footer;
