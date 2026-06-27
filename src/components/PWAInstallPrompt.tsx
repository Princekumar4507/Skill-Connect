import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 3 days
      if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return;
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Detect iOS
    const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS guide after a short delay
      const timer = setTimeout(() => setShowIOSGuide(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // iOS guide
  if (isIOS && showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 animate-in fade-in duration-300">
        <div className="w-full max-w-md mx-4 mb-6 rounded-2xl bg-card border shadow-2xl p-5 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Install Skill-Connect</h3>
                <p className="text-xs text-muted-foreground">Get the full app experience</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
              <span className="text-lg">1.</span>
              <p>Tap the <strong className="text-foreground">Share</strong> button <span className="inline-block text-base">⬆️</span> in Safari</p>
            </div>
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
              <span className="text-lg">2.</span>
              <p>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></p>
            </div>
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
              <span className="text-lg">3.</span>
              <p>Tap <strong className="text-foreground">"Add"</strong> — that's it! 🎉</p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={handleDismiss}>
            Got it
          </Button>
        </div>
      </div>
    );
  }

  // Android / Desktop prompt
  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-4 mb-6 rounded-2xl bg-card border shadow-2xl p-5 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Install Skill-Connect</h3>
              <p className="text-xs text-muted-foreground">Fast access from your home screen</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleDismiss}>
            Not now
          </Button>
          <Button className="flex-1" onClick={handleInstall}>
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
