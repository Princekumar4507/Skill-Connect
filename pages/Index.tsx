import { Link, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Logo from "@/components/Logo";
import { ArrowRight, CheckCircle, User, UsersRound, Calendar, Sparkles, Zap, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (user) return <Navigate to="/home" replace />;
  return (
  <Layout>
    {/* Hero */}
    <section className="relative py-20 md:py-32 text-center px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-blob" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float-slow" />

      <div className="container max-w-4xl relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-card/50 backdrop-blur-sm text-sm text-muted-foreground mb-8 animate-fade-in">
          <Sparkles className="h-4 w-4 text-primary" />
          Built for college students
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight" style={{ animationDelay: "0.1s" }}>
          <span className="animate-slide-up block">Grow Together,</span>
          <span className="animate-slide-up block gradient-text" style={{ animationDelay: "0.2s" }}>
            Connect Across Colleges
          </span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up opacity-0" style={{ animationDelay: "0.4s" }}>
          A platform exclusively for students to connect, collaborate, and showcase skills across colleges.
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap animate-slide-up opacity-0" style={{ animationDelay: "0.6s" }}>
          <Link
            to="/auth"
            className="gradient-primary text-primary-foreground px-7 sm:px-9 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
          >
            Sign Up with College Email <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth"
            className="glass px-7 sm:px-9 py-3.5 rounded-xl font-semibold text-foreground hover:bg-card/90 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
          >
            Log In
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-1.5 animate-slide-up opacity-0" style={{ animationDelay: "0.8s" }}>
          <CheckCircle className="h-4 w-4 text-primary" /> Verified college students only
        </p>
      </div>
    </section>

    {/* Features */}
    <section className="py-16 md:py-24 relative">
      <div className="absolute inset-0 bg-secondary/20" />
      <div className="container grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl px-4 relative z-10">
        {[
          { icon: User, title: "Showcase Skills", desc: "Build your profile, highlight your skills, and share your projects with peers.", delay: "0s" },
          { icon: UsersRound, title: "Find Teammates", desc: "Connect with students from different colleges who share your interests.", delay: "0.15s" },
          { icon: Calendar, title: "Join Events", desc: "Discover hackathons, workshops, and college events across campuses.", delay: "0.3s" },
        ].map(({ icon: Icon, title, desc, delay }) => (
          <div
            key={title}
            className="glass rounded-2xl p-7 md:p-8 text-center card-hover gradient-border animate-slide-up opacity-0"
            style={{ animationDelay: delay }}
          >
            <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg animate-bounce-in" style={{ animationDelay: delay }}>
              <Icon className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* How it works */}
    <section className="py-16 md:py-24 relative">
      <div className="container max-w-4xl text-center px-4">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 animate-slide-up opacity-0">
          How <span className="gradient-text">Skill-Connect</span> Works
        </h2>
        <p className="text-muted-foreground mb-12 md:mb-16 animate-slide-up opacity-0" style={{ animationDelay: "0.1s" }}>
          A simple process to connect with students across colleges.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden sm:block absolute top-8 left-[20%] right-[20%] h-0.5 gradient-primary opacity-30 rounded-full" />

          {[
            { step: 1, title: "Sign Up", desc: "Create an account using your verified college email address.", icon: Zap, delay: "0.2s" },
            { step: 2, title: "Build Profile", desc: "Showcase your skills, projects, and interests to stand out.", icon: User, delay: "0.35s" },
            { step: 3, title: "Connect & Collaborate", desc: "Find peers, join communities, and collaborate on projects.", icon: Globe, delay: "0.5s" },
          ].map(({ step, title, desc, icon: Icon, delay }) => (
            <div key={step} className="flex flex-col items-center animate-slide-up opacity-0" style={{ animationDelay: delay }}>
              <div className="relative mb-5">
                <div className="h-16 w-16 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg glow-primary animate-float" style={{ animationDelay: `${step * 0.5}s` }}>
                  {step}
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl animate-float-slow" />

      <div className="container max-w-3xl text-center relative z-10">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4 animate-slide-up opacity-0">
          Connect. Collaborate. <span className="gradient-text">Create.</span>
        </h2>
        <p className="text-muted-foreground mb-10 animate-slide-up opacity-0" style={{ animationDelay: "0.1s" }}>
          Skill-Connect is built exclusively for students, by students.
        </p>
        <Link
          to="/auth"
          className="shimmer-btn animate-shimmer text-primary-foreground px-9 py-4 rounded-xl font-semibold inline-flex items-center gap-2 transition-all duration-300 hover:scale-105 glow-primary animate-pulse-glow animate-slide-up opacity-0"
          style={{ animationDelay: "0.2s" }}
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  </Layout>
  );
};

export default LandingPage;
