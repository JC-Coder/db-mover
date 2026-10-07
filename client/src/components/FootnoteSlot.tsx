import { useEffect } from "react";

const FOOTNOTE_SCRIPT_ID = "footnote-widget-script";
const FOOTNOTE_SCRIPT_SRC = "https://cdn.getfootnote.dev/v1/w.js";

const FOOTNOTE_SLOTS = {
  top: { id: "fn_cbh5xphin6", size: "top" },
  footer: { id: "fn_c8qb6iaayk", size: undefined },
} as const;

interface IFootnoteSlotProps {
  placement: keyof typeof FOOTNOTE_SLOTS;
  className?: string;
}

export function FootnoteSlot({ placement, className }: IFootnoteSlotProps) {
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

  const { id, size } = FOOTNOTE_SLOTS[placement];

  return <div data-footnote-slot={id} data-footnote-size={size} className={className} />;
}
