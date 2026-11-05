import { useRouter } from "next/router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { notify } from "@/lib/activity";
import { api } from "@/lib/api";
import type { ChatEvent, ChatStatus } from "@/lib/chat";
import { onChatEvent, onSocketStatus, socketStatus, startChat, stopChat, type SocketStatus } from "@/lib/chatSocket";
import { chime } from "@/lib/chime";
import { useI18n } from "@/lib/i18n";

type ChatValue = {
  enabled: boolean;
  status: SocketStatus;
  houseOnline: boolean;
  unread: number;
  /** Conversation on screen right now (admin: member id; member: "self" while the panel is open). */
  setViewing: (id: string | null) => void;
  subscribe: (listener: (event: ChatEvent) => void) => () => void;
};

const ChatContext = createContext<ChatValue>({
  enabled: false,
  status: "idle",
  houseOnline: false,
  unread: 0,
  setViewing: () => {},
  subscribe: () => () => {},
});

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const role = user?.role ?? null;
  const [status, setStatus] = useState<SocketStatus>(socketStatus());
  const [houseOnline, setHouseOnline] = useState(false);
  const viewing = useRef<string | null>(null);

  const counts = useQuery({
    queryKey: ["chat", "unread", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (role === "ADMIN") {
        const result = await api<{ unread: number }>("/api/admin/chat/unread", { quiet: true });
        return { houseOnline: true, unread: result.unread } satisfies ChatStatus;
      }
      return api<ChatStatus>("/api/chat/status", { quiet: true });
    },
  });

  useEffect(() => {
    if (role !== "ADMIN" && counts.data) setHouseOnline(counts.data.houseOnline);
  }, [counts.data, role]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const offStatus = onSocketStatus(setStatus);
    startChat();
    setStatus(socketStatus());
    return () => {
      offStatus();
      stopChat();
    };
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    return onChatEvent((event) => {
      switch (event.type) {
        case "connected":
          client.invalidateQueries({ queryKey: ["chat"] });
          break;
        case "kicked":
          client.invalidateQueries({ queryKey: ["me"] });
          break;
        case "hello":
          setHouseOnline(event.houseOnline);
          break;
        case "house":
          setHouseOnline(event.online);
          break;
        case "presence":
          client.invalidateQueries({ queryKey: ["chat", "conversations"] });
          break;
        case "cleared":
        case "read":
          client.invalidateQueries({ queryKey: ["chat", "unread"] });
          client.invalidateQueries({ queryKey: ["chat", "conversations"] });
          break;
        case "message": {
          client.invalidateQueries({ queryKey: ["chat", "unread"] });
          client.invalidateQueries({ queryKey: ["chat", "conversations"] });
          const visible = document.visibilityState === "visible";
          if (user.role === "ADMIN" && !event.message.fromHouse) {
            const onScreen = visible && router.pathname === "/admin/chat" && viewing.current === event.memberId;
            if (!onScreen) {
              chime();
              notify("info", "chat.newMessage", {
                text: t("chat.newFrom").replace("{name}", event.memberName ?? t("chat.member")),
                href: `/admin/chat?member=${event.memberId}`,
              });
            }
          }
          if (user.role !== "ADMIN" && event.message.fromHouse && !(visible && viewing.current === "self")) {
            chime();
          }
          break;
        }
      }
    });
  }, [client, router.pathname, t, user]);

  const unread = user ? counts.data?.unread ?? 0 : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      const base = document.title.replace(/^\(\d+\) /, "");
      document.title = unread > 0 ? `(${unread}) ${base}` : base;
    }, 60);
    return () => clearTimeout(timer);
  }, [unread, router.asPath]);

  const setViewing = useCallback((id: string | null) => {
    viewing.current = id;
  }, []);

  const value = useMemo<ChatValue>(
    () => ({
      enabled: Boolean(user),
      status: user ? status : "idle",
      houseOnline,
      unread,
      setViewing,
      subscribe: onChatEvent,
    }),
    [houseOnline, setViewing, status, unread, user],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
