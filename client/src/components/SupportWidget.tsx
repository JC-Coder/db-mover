import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/lib/theme";

interface ISupportWidgetProps {
  username?: string;
  text?: string;
  title?: string;
}

const HIDDEN_PATH_PREFIXES = ["/config", "/browser", "/migration"];

function shouldHideWidget(pathname: string): boolean {
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function SupportWidget({
  username = "jccoder",
  text = "Support Project",
  title = "Support DB Mover",
}: ISupportWidgetProps) {
  const { theme } = useTheme();
  const location = useLocation();
  const isHidden = shouldHideWidget(location.pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanupWidget = () => {
      const SCRIPT_ID = "happr-widget-script";
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript) {
        existingScript.remove();
      }

      // Clean up injected Happr widget DOM nodes
      const injectedElements = document.querySelectorAll(
        ".happr-widget-container, #happr-widget-root, [id^='happr-'], [id*='happr'], [class*='happr'], a[href*='myhappr.com'], iframe[src*='myhappr.com']",
      );
      injectedElements.forEach((el) => el.remove());
    };

    if (isHidden) {
      cleanupWidget();
      return;
    }

    cleanupWidget();

    // Adapt colors dynamically based on the DB Mover theme
    const isDark = theme === "dark";
    const brandColor = isDark ? "#C98A3D" : "#B8752F";
    const textColor = isDark ? "#120B07" : "#FFF8EF";

    const script = document.createElement("script");
    script.id = "happr-widget-script";
    script.src = "https://myhappr.com/widget.js";
    script.async = true;
    script.setAttribute("data-username", username);
    script.setAttribute("data-color", brandColor);
    script.setAttribute("data-text-color", textColor);
    script.setAttribute("data-radius", "9999px");
    script.setAttribute("data-text", text);
    if (title) {
      script.setAttribute("data-title", title);
    }
    script.setAttribute("data-theme", isDark ? "dark" : "light");

    document.body.appendChild(script);

    return () => {
      cleanupWidget();
    };
  }, [theme, username, text, title, isHidden]);

  return null;
}

