import { createRoot } from "react-dom/client";
import { useState, useCallback } from "react";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import "./index.css";

const Root = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only when launched as PWA (standalone mode)
    return window.matchMedia("(display-mode: standalone)").matches ||
           (window.navigator as any).standalone === true;
  });

  const handleFinish = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinish} />}
      <App />
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
