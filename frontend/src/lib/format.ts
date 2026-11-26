import { mockNow } from "../data/mock";

/** "none" is shown as "No aid"; other aids are capitalised. */
export const aidName = (aid: string) => (aid === "none" ? "No aid" : aid.charAt(0).toUpperCase() + aid.slice(1));
export const percent = (n: number) => `${Math.round(n * 100)}%`;
const hhmm = (iso: string) => iso.slice(11, 16);

/** All times are shown in UTC, like "14:28 UTC". */
export const time = (iso: string) => `${hhmm(iso)} UTC`;

/** Today shows just the time; yesterday and older also say which day. */
export function when(iso: string): string {
  const day = iso.slice(0, 10);
  const today = mockNow().toISOString().slice(0, 10);
  const yesterday = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  if (day === today) return time(iso);
  return day === yesterday ? `Yesterday · ${time(iso)}` : `${day} · ${time(iso)}`;
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
