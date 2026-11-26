import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { homeFor, initialsOf, useAuth } from "../../auth/AuthContext";
import type { Role } from "../../data/types";
import { useTheme } from "../../theme";
import { Button } from "../ui/Button";
import { Icon, type IconName } from "../ui/Icon";

type Item = { to: string; label: string; icon: IconName };

// The navigation of each role (Foundations page: "Navigation changes by breakpoint").
function navFor(role: Role): Item[] {
  if (role === "family") return [{ to: "/home", label: "Home", icon: "home" }, { to: "/account", label: "Account", icon: "account" }];
  if (role === "nurse") return [{ to: "/dashboard", label: "Dashboard", icon: "dashboard" }, { to: "/account", label: "Account", icon: "account" }];
  return [
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/admin/patients", label: "Patients", icon: "patients" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/settings", label: "Settings", icon: "settings" },
    { to: "/account", label: "Account", icon: "account" },
  ];
}

const link = "flex min-h-11 items-center gap-2.5 rounded-lg px-3 font-semibold text-muted hover:bg-surface-subtle";
const linkActive = "!bg-primary-soft !text-primary";

export function AppShell() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMore(false), [pathname]);
  if (!user) return null;
  const items = navFor(user.role);
  // On a phone the bottom bar has at most five items. Account moves into "More" when an admin has many.
  const bottom = user.role === "admin" ? items.filter((i) => i.to !== "/account") : items;
  const roleLabel = user.role[0]!.toUpperCase() + user.role.slice(1);

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>

      <header className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center gap-3 border-b border-border bg-surface px-4 md:px-5">
        <span className="flex items-center gap-2 text-xs leading-tight font-bold">
          <i className="grid size-7 place-items-center rounded-lg bg-[#0b695b] text-white not-italic"><Icon name={user.role === "family" ? "home" : "dashboard"} size={15} /></i>
          <b>Mobility Aid<br />Compliance</b>
        </span>
        <span className="flex-1" />
        <span className="hidden min-w-0 text-right text-xs leading-tight md:block">
          <span className="block truncate font-bold">{user.name}</span>
          <span className="text-muted">{roleLabel}</span>
        </span>
        <button type="button" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="grid size-11 place-items-center rounded-lg border border-border bg-surface text-fg hover:bg-surface-subtle">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <div className="hidden md:block"><Button variant="secondary" onClick={signOut}>Sign out</Button></div>
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="grid size-11 place-items-center rounded-full md:hidden">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{initialsOf(user.name)}</span>
          <span className="sr-only">Account menu for {user.name}</span>
        </button>
      </header>

      <aside aria-label="Main navigation" className="fixed top-[60px] bottom-0 left-0 z-20 hidden w-[72px] flex-col border-r border-border bg-surface px-2 py-6 md:flex lg:w-[220px] lg:px-3">
        <nav className="grid gap-1.5">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} title={i.label} aria-label={i.label} className={({ isActive }) => `${link} justify-center lg:justify-start ${isActive ? linkActive : ""}`}>
              <Icon name={i.icon} size={18} />
              <span className="hidden lg:inline">{i.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto flex items-start gap-2 rounded-lg bg-surface-subtle p-2 text-xs text-muted lg:p-3" title="No camera images are captured">
          <span className="shrink-0"><Icon name="eyeOff" size={16} /></span>
          <span className="hidden lg:inline">No camera images are captured</span>
          <span className="sr-only lg:hidden">No camera images are captured</span>
        </p>
      </aside>

      <main id="content" className="pt-[60px] md:pl-[72px] lg:pl-[220px]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-28 md:px-6 md:pb-10 lg:px-8">
          <Outlet />
        </div>
      </main>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 flex h-[66px] items-center justify-around border-t border-border bg-surface md:hidden">
        {bottom.map((i) => (
          <NavLink key={i.to} to={i.to} className={({ isActive }) => `flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold ${isActive ? "text-primary" : "text-muted"}`}>
            <Icon name={i.icon} size={19} />{i.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold text-muted">
          <Icon name="more" size={19} />More
        </button>
      </nav>

      {more && (
        <div className="md:hidden">
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30" onClick={() => setMore(false)} />
          <div role="menu" className="fixed right-3 bottom-[78px] z-40 w-64 rounded-xl border border-border bg-surface p-2 shadow-card">
            <p className="px-3 py-2 text-xs"><b className="block text-sm">{user.name}</b><span className="text-muted">{roleLabel}</span></p>
            {user.role === "admin" && (
              <NavLink to="/account" role="menuitem" className={({ isActive }) => `${link} ${isActive ? linkActive : ""}`}><Icon name="account" size={18} />Account</NavLink>
            )}
            <button type="button" role="menuitem" onClick={toggle} className={`${link} w-full`}><Icon name={theme === "dark" ? "sun" : "moon"} size={18} />{theme === "dark" ? "Light theme" : "Dark theme"}</button>
            <button type="button" role="menuitem" onClick={signOut} className={`${link} w-full`}><Icon name="lock" size={18} />Sign out</button>
            <p className="mt-1 flex items-start gap-2 rounded-lg bg-surface-subtle p-3 text-xs text-muted"><span className="shrink-0"><Icon name="eyeOff" size={16} /></span>No camera images are captured</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { homeFor };
