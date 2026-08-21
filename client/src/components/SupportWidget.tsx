import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

interface ISupportWidgetProps {
  username?: string;
  text?: string;
  title?: string;
}

export function SupportWidget({
  username = "jccoder",
  text = "Support Project",
  title = "Support DB Mover",
}: ISupportWidgetProps) {
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SCRIPT_ID = "myhappr-widget-script";

    // Clean up any existing instances first
    const cleanup = () => {
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
      ["myhappr-floating-btn", "myhappr-modal-overlay", "myhappr-widget-styles", "myhappr-widget-font"].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.remove();
      });
    };

    cleanup();

    const isDark = theme === "dark";
    const brandColor = isDark ? "#C98A3D" : "#B8752F";
    const buttonTextColor = isDark ? "#120B07" : "#FFF8EF";
    // Donation form (drawer) card + text colors, matched to the DB Mover palette.
    // Dark mode uses the warm near-black card surface so the form isn't a white box;
    // light mode keeps a clean white card. A dark cardBg auto-flips the embed to dark.
    const cardBg = isDark ? "#110C0A" : "#FFFFFF";
    const cardText = isDark ? "#F5EDE3" : "#120B07";

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://myhappr.com/widget.js";

    script.async = true;

    script.setAttribute("data-username", username);
    script.setAttribute("data-theme", "transparent");
    script.setAttribute("data-color", brandColor);
    script.setAttribute("data-button-color", brandColor);
    script.setAttribute("data-text-color", buttonTextColor);
    script.setAttribute("data-radius", "9999px");
    script.setAttribute("data-text", text);
    script.setAttribute("data-title", title);
    script.setAttribute("data-font", "Inter");
    script.setAttribute("data-card-bg", cardBg);
    script.setAttribute("data-card-text", cardText);

    document.body.appendChild(script);

    return cleanup;
  }, [theme, username, text, title]);

  return null;
}