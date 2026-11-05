export const CHAT_MAX = 2000;

export type ChatMessage = {
  id: string;
  body: string;
  fromHouse: boolean;
  senderName: string | null;
  createdAt: string;
  clientId: string | null;
  /** Local only: optimistic message waiting for the server, or one that failed to send. */
  state?: "sending" | "failed";
  error?: string;
};

export type ChatMember = {
  id: string;
  firstName: string;
  lastName: string;
  memberCode: string;
  online: boolean;
  active: boolean;
};

export type ChatPage = { messages: ChatMessage[]; hasMore: boolean };
export type ChatThreadView = ChatPage & { member: ChatMember };
export type ChatConversation = { member: ChatMember; lastMessage: ChatMessage | null; unread: number; lastMessageAt: string };
export type ChatStatus = { houseOnline: boolean; unread: number };

export type ChatEvent =
  | { type: "connected" }
  | { type: "kicked" }
  | { type: "hello"; houseOnline: boolean }
  | { type: "house"; online: boolean }
  | { type: "presence"; memberId: string; online: boolean }
  | { type: "message"; memberId: string; memberName?: string; message: ChatMessage }
  | { type: "read"; memberId: string; side: "house" | "member" }
  | { type: "cleared"; memberId: string };

export function makeClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Adds server messages to the list: the same id is kept once and an optimistic message is replaced by the
 * server copy carrying its clientId. Confirmed messages are ordered by time; local ones stay at the end.
 */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  const local: ChatMessage[] = [];
  const confirmedClientIds = new Set(incoming.map((message) => message.clientId).filter(Boolean));
  for (const message of current) {
    if (message.state) {
      if (!message.clientId || !confirmedClientIds.has(message.clientId)) local.push(message);
    } else {
      byId.set(message.id, message);
    }
  }
  for (const message of incoming) {
    byId.set(message.id, { ...message, state: undefined, error: undefined });
  }
  const confirmed = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return [...confirmed, ...local];
}

export function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** "today" | "yesterday" | a formatted date, relative to `now`. */
export function dayLabel(iso: string, locale: string, now = new Date()): string {
  const date = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(iso) === dayKey(now.toISOString())) return "today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "yesterday";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "pt-BR", {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function timeLabel(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "en" ? "en-GB" : "pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function initials(first: string, last: string): string {
  return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || "?";
}
