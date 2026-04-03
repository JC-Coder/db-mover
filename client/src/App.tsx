import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { LandingPage } from "@/components/LandingPage";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Github, BarChart3 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { SelectPage } from "@/pages/SelectPage";
import { ConfigPage } from "@/pages/ConfigPage";
import { MigrationPage } from "@/pages/MigrationPage";
import { StatsPage } from "@/pages/StatsPage";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.pathname.startsWith("/migration/")) {
      if (
        !confirm(
          "A migration is currently in progress. Interrupting might leave databases in an inconsistent state. Continue?",
        )
      )
        return;
    }
    navigate(-1);
  };

  const isLanding = location.pathname === "/";

  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/JC-Coder/db-mover")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(() => setStars(null));
  }, []);

  return (
    <div className="min-h-screen bg-mesh text-foreground flex flex-col font-sans selection:bg-indigo-500/30 relative font-feature-settings-['ss01']">
      <div className="fixed inset-0 bg-noise z-0 opacity-[0.02]" />

      <header className="sticky top-0 z-[100] w-full border-b border-white/[0.05] bg-black/20 backdrop-blur-md py-4 transition-all">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 glass-panel rounded-xl flex items-center justify-center group-hover:bg-white/5 transition-colors overflow-hidden p-1.5">
              <img
                src="/logo.svg"
                alt="DB Mover Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white/90">
              DB MOVER
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/stats"
              className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all"
            >
              <BarChart3 className="h-4 w-4 text-white/70" />
              <span className="text-xs font-bold text-white/70">Stats</span>
            </Link>
            {stars !== null && (
              <a
                href="https://github.com/JC-Coder/db-mover"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
              >
                <Github className="h-4 w-4 text-white/70" />
                <span className="text-xs font-bold text-white/70">{stars}</span>
              </a>
            )}

            {!isLanding && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-full px-6 hover:bg-white/5 transition-all text-xs font-bold"
              >
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={<LandingPage onStart={() => navigate("/select")} />}
            />
            <Route path="/select" element={<SelectPage />} />
            <Route path="/config/:dbType" element={<ConfigPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/migration/:jobId" element={<MigrationPage />} />
          </Routes>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-12 border-t border-white/[0.03] bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="DB Mover Logo" className="h-6 w-6" />
            <span className="font-bold text-lg text-white/90 tracking-tight">
              DB MOVER
            </span>
          </div>
          <div className="flex items-center gap-8 text-xs font-medium text-white/30 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-400 transition-colors">
              Docs
            </a>
            <a href="#" className="hover:text-indigo-400 transition-colors">
              Security
            </a>
            <a
              href="https://github.com/JC-Coder/db-mover"
              className="hover:text-indigo-400 transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/20">
            © {new Date().getFullYear()} • All Rights Reserved
          </p>
        </div>
      </footer>

      <Toaster position="bottom-right" closeButton theme="dark" />
    </div>
  );
}

export default App;
