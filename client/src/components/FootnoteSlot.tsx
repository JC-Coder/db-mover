import { useEffect } from "react";

const FOOTNOTE_SCRIPT_ID = "footnote-widget-script";
const FOOTNOTE_SCRIPT_SRC = "https://cdn.getfootnote.dev/v1/w.js";

interface IFootnoteSlotProps {
  className?: string;
}

export function FootnoteSlot({ className }: IFootnoteSlotProps) {
  useEffect(() => {
    // Re-inject on every mount so the widget rescans after client-side navigation remounts the slot.
    document.getElementById(FOOTNOTE_SCRIPT_ID)?.remove();

    const script = document.createElement("script");
    script.id = FOOTNOTE_SCRIPT_ID;
    script.src = FOOTNOTE_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return <div data-footnote-slot="fn_c8qb6iaayk" className={className} />;
}
