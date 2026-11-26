import type { ReactNode } from "react";

export type IconName =
  | "account"
  | "alert"
  | "arrow"
  | "check"
  | "clock"
  | "close"
  | "dashboard"
  | "escalated"
  | "eyeOff"
  | "home"
  | "info"
  | "lock"
  | "menu"
  | "more"
  | "moon"
  | "patients"
  | "review"
  | "rooms"
  | "settings"
  | "sun"
  | "users";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    alert: (
      <>
        <path d="M12 4 3 20h18L12 4Z" />
        <path d="M12 10v4m0 3h.01" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    escalated: <path d="M12 4 21 20H3L12 4Z" fill="currentColor" stroke="none" />,
    eyeOff: (
      <>
        <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A11 11 0 0 1 12 4c5.5 0 9 6 9 8a9.5 9.5 0 0 1-2 3.4M6.7 6.7C4.3 8.2 3 10.7 3 12c0 2 3.5 8 9 8 1.3 0 2.5-.3 3.5-.8" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    moon: <path d="M20.5 15.3A9 9 0 0 1 8.7 3.5a9 9 0 1 0 11.8 11.8Z" />,
    patients: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0m2-8a3 3 0 1 0 0-6m4 14a6 6 0 0 0-4-5.7" />
      </>
    ),
    review: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h5m2 5 1.5 1.5L20 15" />
      </>
    ),
    rooms: (
      <>
        <path d="M4 21V3h12v18M8 7h4M8 11h4M8 15h4m4-7h4v13" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 15.5 21 17l-4 4-1.5-2a8 8 0 0 1-3.5 1l-.5 2h-5l-.5-2a8 8 0 0 1-3-2L2 16l2-3a8 8 0 0 1 0-3L2 7l4-4 2 1a8 8 0 0 1 3-.5L12 2h4l.5 2a8 8 0 0 1 3 2L22 7l-2 3a8 8 0 0 1-1 5.5Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    users: (
      <>
        <circle cx="8" cy="8" r="4" />
        <path d="M1 21a7 7 0 0 1 14 0m4-9v6m-3-3h6" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
