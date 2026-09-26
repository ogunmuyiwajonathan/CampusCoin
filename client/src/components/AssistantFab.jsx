import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "./Icon.jsx";
import AssistantChat from "./AssistantChat.jsx";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mobile/tablet entry point for the AI Assistant. The bottom tab bar only
// covers phones, and the /assistant route needs a full page on desktop, so this
// FAB is the one-tap way to open Rix over any other app page below lg.
// Desktop (lg+) hides it — the sidebar nav item is the entry point there.
export default function AssistantFab() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const fabRef = useRef(null);
  const panelRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  // Focus management: move focus into the panel on open, trap Tab while open,
  // Escape closes, scroll locked behind the backdrop.
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  // On /assistant the full page already shows Rix — a FAB would be redundant.
  if (location.pathname === "/assistant") return null;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI Assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:bottom-6 md:right-6 lg:hidden"
      >
        <Icon name="bot" size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div
            className="absolute inset-0 animate-[fade-in_200ms_ease-out] bg-black/50"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="AI Assistant"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] animate-[slide-up_250ms_ease-out] flex-col rounded-t-2xl bg-surface shadow-card focus:outline-none md:inset-x-auto md:right-6 md:top-16 md:bottom-6 md:w-[420px] md:rounded-2xl md:animate-[panel-in_200ms_ease-out]"
          >
            {/* The chat's own header X is the dialog's single close affordance;
                negative margins pull it tight to the panel corner. */}
            <div className="-mr-1 -mt-1 flex min-h-0 flex-1 flex-col">
              <AssistantChat onClose={close} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
