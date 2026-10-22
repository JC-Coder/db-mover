import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

export const SUPPORT_WIDGET_IDS = [
  "myhappr-widget-script",
  "myhappr-floating-btn",
  "myhappr-modal-overlay",
  "myhappr-widget-styles",
  "myhappr-widget-font",
];

export const removeSupportWidget = () => {
  if (typeof document === "undefined") return;

  SUPPORT_WIDGET_IDS.forEach((id) => {
    document.getElementById(id)?.remove();
  });
};

export const openSupportWidget = () => {
  document.getElementById("myhappr-floating-btn")?.click();
};

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
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    removeSupportWidget();

    const isDark = theme === "dark";
    const brandColor = isDark ? "#C98A3D" : "#B8752F";
    const buttonTextColor = isDark ? "#120B07" : "#FFF8EF";
    // Donation form (drawer) card + text colors, matched to the DB Mover palette.
    // Dark mode uses the warm near-black card surface so the form isn't a white box;
    // light mode keeps a clean white card. A dark cardBg auto-flips the embed to dark.
    const cardBg = isDark ? "#110C0A" : "#FFFFFF";
    const cardText = isDark ? "#F5EDE3" : "#120B07";

    const script = document.createElement("script");
    script.id = "myhappr-widget-script";
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
    // Inline mode inserts the button right after the script tag, so it lands in this slot
    // instead of the widget's own fixed bottom-right position.
    script.setAttribute("data-inline", "true");

    slot.appendChild(script);

    return removeSupportWidget;
  }, [theme, username, text, title]);

  return <div ref={slotRef} className="flex" />;
}
