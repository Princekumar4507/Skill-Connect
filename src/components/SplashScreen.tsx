import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const finish = setTimeout(onFinish, 2300);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: "linear-gradient(135deg, hsl(174, 72%, 30%) 0%, hsl(222, 30%, 12%) 50%, hsl(270, 40%, 25%) 100%)" }}
    >
      {/* Floating blobs */}
      <div className="absolute top-1/4 -left-20 w-60 h-60 rounded-full bg-primary/20 blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float-slow" />

      <div className="animate-bounce-in flex flex-col items-center gap-5 relative z-10">
        <div className="animate-float">
          <Logo size={80} />
        </div>
        <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
          Skill<span className="opacity-70">-Connect</span>
        </h1>
        <p className="text-sm text-primary-foreground/50 tracking-wide uppercase">Campus Networking</p>
      </div>

      <div className="absolute bottom-12 z-10">
        <div className="w-8 h-8 border-2 border-primary-foreground/20 border-t-primary-foreground/80 rounded-full animate-spin" />
      </div>
    </div>
  );
};

export default SplashScreen;
