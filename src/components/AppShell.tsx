import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, WifiOff } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";

function isActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

export function AppShell() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const online = useOnline();

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <div className="mb-9 flex items-center gap-2.5 px-2">
          <span className="inline-block h-2 w-2 animate-gold-dot rounded-full bg-gold" />
          <span className="font-display text-xl tracking-tight text-foreground">
            FlowState
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-sidebar-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold"
                  />
                )}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname === "/settings"
                ? "bg-surface-2 text-foreground"
                : "text-sidebar-foreground hover:bg-surface hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 pb-24 md:pb-0">
        <AnimatePresence>
          {!online && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-center gap-2 bg-surface-2 px-4 py-2 text-xs text-muted-foreground"
            >
              <WifiOff className="h-3.5 w-3.5" />
              You're offline. Your data is safe.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto w-full max-w-3xl px-5 py-7 md:px-8 md:py-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-gold"
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-gold" : "text-sidebar-foreground",
                )}
              />
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  active ? "text-foreground" : "text-sidebar-foreground",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
