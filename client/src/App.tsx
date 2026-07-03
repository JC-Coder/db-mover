import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence } from "framer-motion";
import { SelectPage } from "@/pages/SelectPage";
import { ConfigPage } from "@/pages/ConfigPage";
import { MigrationPage } from "@/pages/MigrationPage";
import { StatsPage } from "@/pages/StatsPage";
import { BrowserPage } from "@/pages/BrowserPage";
import { LandingPageV2 } from "@/components/LandingPageV2";
import { ThemeProvider, THEME_VARS, useTheme } from "@/lib/theme";

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  return (
    <div
      className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text)] flex flex-col font-sans selection:bg-indigo-500/30 relative transition-colors duration-500 font-feature-settings-['ss01']"
      style={THEME_VARS[theme]}
      data-theme={theme}
    >
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
            <Route path="/browser/:dbType" element={<BrowserPage />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Toaster position="bottom-right" closeButton theme={theme} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;
