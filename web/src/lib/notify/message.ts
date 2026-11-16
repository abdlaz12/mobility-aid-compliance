// What a push notification says. NFR3.3: room, aid status, time and a patient reference (initials and
// code) only. The full name appears inside the authenticated dashboard and never in a notification.

export type AlertMessageInput = {
  level: string;
  initials: string;
  code: string;
  roomId: string;
  aidLabel: string;
  timestamp: Date;
};

export type Message = { title: string; body: string; priority: 0 | 1 };

const LABEL: Record<string, string> = { warning: "Warning", escalated: "ESCALATED", emergency: "EMERGENCY", info: "Info" };

export function buildMessage(i: AlertMessageInput): Message {
  const time = i.timestamp.toISOString().slice(11, 16);
  return {
    title: `${LABEL[i.level] ?? i.level}: ${i.initials} (${i.code})`,
    body: `Room ${i.roomId} · aid detected: ${i.aidLabel} · ${time} UTC`,
    // Pushover priority 2 needs retry and expire settings, so the strongest level used here is 1.
    priority: i.level === "escalated" || i.level === "emergency" ? 1 : 0,
  };
}
