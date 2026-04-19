import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence } from "framer-motion";
import { SelectPage } from "@/pages/SelectPage";
import { ConfigPage } from "@/pages/ConfigPage";
import { MigrationPage } from "@/pages/MigrationPage";
import { StatsPage } from "@/pages/StatsPage";
import { LandingPageV2 } from "@/components/LandingPageV2";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-mesh text-foreground flex flex-col font-sans selection:bg-indigo-500/30 relative font-feature-settings-['ss01']">
      <div className="fixed inset-0 bg-noise z-0 opacity-[0.02]" />

      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={<LandingPageV2 onStart={() => navigate("/select")} />}
            />
            <Route path="/select" element={<SelectPage />} />
            <Route path="/config/:dbType" element={<ConfigPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/migration/:jobId" element={<MigrationPage />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Toaster position="bottom-right" closeButton theme="dark" />
    </div>
  );
}

export default App;
