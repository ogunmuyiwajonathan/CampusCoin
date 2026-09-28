import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import AssistantChat from "../../components/AssistantChat.jsx";

export default function Assistant() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />

      <div className="lg:pl-60">
        <main className="flex min-h-svh flex-col px-4 pb-24 pt-5 md:pb-5">
          <header className="mb-4 flex items-center gap-3">
            <button
              type="button"
              className="hidden rounded-lg p-2 hover:bg-surface md:inline-flex lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <Link
              to="/"
              aria-label="Campus Coin home"
              className="flex items-center gap-1.5 md:hidden"
            >
              <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
              <span className="font-display text-lg font-bold tracking-wide text-forest-900 dark:text-sage-100">
                Campus Coin
              </span>
            </Link>
            <h1 className="sr-only">Rix, AI Assistant</h1>
          </header>

          <AssistantChat />
        </main>
      </div>
    </div>
  );
}
