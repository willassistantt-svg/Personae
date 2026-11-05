import { describe, expect, it } from "vitest";
import { dayLabel, initials, mergeMessages, type ChatMessage } from "@/lib/chat";

const message = (id: string, createdAt: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  body: id,
  fromHouse: false,
  senderName: null,
  createdAt,
  clientId: null,
  ...extra,
});

describe("chat messages", () => {
  it("orders confirmed messages by time and keeps one copy per id", () => {
    const merged = mergeMessages(
      [message("b", "2026-11-04T10:02:00Z"), message("a", "2026-11-04T10:01:00Z")],
      [message("c", "2026-11-04T10:03:00Z"), message("b", "2026-11-04T10:02:00Z")],
    );
    expect(merged.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("replaces the optimistic copy when the server confirms it", () => {
    const pending = message("local-x", "2026-11-04T10:05:00Z", { clientId: "x", state: "sending" });
    const merged = mergeMessages([message("a", "2026-11-04T10:01:00Z"), pending], [message("srv", "2026-11-04T10:04:59Z", { clientId: "x" })]);
    expect(merged.map((item) => item.id)).toEqual(["a", "srv"]);
    expect(merged[1].state).toBeUndefined();
  });

  it("keeps unconfirmed and failed messages at the end", () => {
    const failed = message("local-y", "2026-11-04T09:00:00Z", { clientId: "y", state: "failed" });
    const merged = mergeMessages([failed], [message("a", "2026-11-04T10:01:00Z")]);
    expect(merged.map((item) => item.id)).toEqual(["a", "local-y"]);
  });

  it("labels today, yesterday and older days", () => {
    const now = new Date(2026, 10, 4, 15, 0);
    expect(dayLabel(new Date(2026, 10, 4, 8, 0).toISOString(), "pt", now)).toBe("today");
    expect(dayLabel(new Date(2026, 10, 3, 23, 0).toISOString(), "pt", now)).toBe("yesterday");
    expect(dayLabel(new Date(2026, 9, 20, 12, 0).toISOString(), "pt", now)).toMatch(/20/);
  });

  it("builds initials", () => {
    expect(initials("helena", "Vasconcelos")).toBe("HV");
  });
});
