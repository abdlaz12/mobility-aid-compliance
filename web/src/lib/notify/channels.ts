import type { Message } from "./message";

export type Delivery = { ok: true } | { ok: false; retry: boolean; error: string };
type Env = Record<string, string | undefined>;
export type Recipient = { id: number; pushoverUserKey: string | null };
export type Channel = { name: string; send(to: Recipient, msg: Message): Promise<Delivery> };

/** Development channel: writes to the server log. Logs the user id, never a name. */
export const logChannel: Channel = {
  name: "log",
  async send(to, msg) {
    console.log(`[notify:log] user ${to.id}: ${msg.title} | ${msg.body}`);
    return { ok: true };
  },
};

/** Pushover needs no app development (docs/decisions.md). Only the minimal message content is sent. */
export function pushoverChannel(appToken: string, fetchImpl: typeof fetch = fetch): Channel {
  return {
    name: "pushover",
    async send(to, msg) {
      if (!to.pushoverUserKey) return { ok: false, retry: false, error: "recipient has no Pushover key" };
      try {
        const res = await fetchImpl("https://api.pushover.net/1/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: appToken, user: to.pushoverUserKey, title: msg.title, message: msg.body, priority: String(msg.priority) }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) return { ok: true };
        // 4xx (bad key, bad request) will not get better by retrying; 429 and 5xx might.
        return { ok: false, retry: res.status >= 500 || res.status === 429, error: `Pushover answered HTTP ${res.status}` };
      } catch {
        return { ok: false, retry: true, error: "network error or timeout" };
      }
    },
  };
}

/** Which channel a recipient gets: Pushover when it is configured for them, otherwise the log. */
export function channelNameFor(user: Recipient, env: Env = process.env): string {
  return env.PUSHOVER_APP_TOKEN && user.pushoverUserKey ? "pushover" : "log";
}

export function defaultChannels(env: Env = process.env): Record<string, Channel> {
  const channels: Record<string, Channel> = { log: logChannel };
  if (env.PUSHOVER_APP_TOKEN) channels.pushover = pushoverChannel(env.PUSHOVER_APP_TOKEN);
  return channels;
}
