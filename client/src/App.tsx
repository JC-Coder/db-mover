import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence } from "framer-motion";
import { LandingPage } from "@/components/LandingPage";
import { DocsPage } from "@/pages/DocsPage";
import { GuidePage } from "@/pages/GuidePage";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { Seo } from "@/components/Seo";
import { getAppRouteSeo } from "@/lib/seo";
import {
  removeSupportWidget,
  SUPPORT_WIDGET_IDS,
  SupportWidget,
} from "@/components/SupportWidget";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { trackAppOpenedOnce, trackTelemetry } from "@/lib/telemetry";

/**
 * Content routes stay statically imported so the prerenderer emits their real markup. The app
 * surfaces below are lazy: they pull in recharts, the migration terminal, and the browser inspector,
 * none of which belong in the bundle a first-time visitor downloads to read the landing page.
 */
const SelectPage = lazy(() =>
  import("@/pages/SelectPage").then((m) => ({ default: m.SelectPage })),
);
const ConfigPage = lazy(() =>
  import("@/pages/ConfigPage").then((m) => ({ default: m.ConfigPage })),
);
const MigrationPage = lazy(() =>
  import("@/pages/MigrationPage").then((m) => ({ default: m.MigrationPage })),
);
const StatsPage = lazy(() =>
  import("@/pages/StatsPage").then((m) => ({ default: m.StatsPage })),
);
const BrowserPage = lazy(() =>
  import("@/pages/BrowserPage").then((m) => ({ default: m.BrowserPage })),
);

/**
 * Content routes carry their own <main> (via ContentLayout and the landing page), so the app
 * surfaces get theirs here — one landmark per route, never nested.
 */
function AppSurface({ children }: { children: ReactNode }) {
  return <main className="block">{children}</main>;
}

function RouteFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--landing-border-strong)] border-t-[var(--landing-accent)]" />
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const appSeo = getAppRouteSeo(location.pathname);
  const isWorkspaceRoute = ["/select", "/config/", "/migration/", "/browser/"].some(
    (path) => location.pathname === path || location.pathname.startsWith(path),
  );

  useEffect(() => {
    trackAppOpenedOnce();
    trackTelemetry("page_viewed");
  }, [location.pathname]);

  useEffect(() => {
    if (!isWorkspaceRoute) return;

    removeSupportWidget();

    // The third-party script may finish after route navigation, so remove anything it adds.
    const observer = new MutationObserver((mutations) => {
      const addedSupportWidget = mutations.some((mutation) =>
        [...mutation.addedNodes].some(
          (node) =>
            node instanceof HTMLElement && SUPPORT_WIDGET_IDS.includes(node.id),
        ),
      );

      if (addedSupportWidget) removeSupportWidget();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isWorkspaceRoute]);

  const launchApp = () => {
    trackTelemetry("landing_cta_clicked");
    navigate("/select");
  };

  return (
    <div
      className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text)] flex flex-col font-sans selection:bg-indigo-500/30 relative transition-colors duration-500 font-feature-settings-['ss01']"
      data-theme={theme}
    >
      <div className="fixed inset-0 bg-noise z-0 opacity-[0.02]" />

      {appSeo && <Seo {...appSeo} />}

      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<LandingPage onStart={launchApp} />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/guides/:slug" element={<GuidePage />} />
              <Route
                path="/select"
                element={
                  <AppSurface>
                    <SelectPage />
                  </AppSurface>
                }
              />
              <Route
                path="/config/:dbType"
                element={
                  <AppSurface>
                    <ConfigPage />
                  </AppSurface>
                }
              />
              <Route
                path="/stats"
                element={
                  <AppSurface>
                    <StatsPage />
                  </AppSurface>
                }
              />
              <Route
                path="/migration/:jobId"
                element={
                  <AppSurface>
                    <MigrationPage />
                  </AppSurface>
                }
              />
              <Route
                path="/browser/:dbType"
                element={
                  <AppSurface>
                    <BrowserPage />
                  </AppSurface>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>

      {!isWorkspaceRoute && <SupportWidget />}
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
