import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "@/components/ChatProvider";
import { ApiError, api } from "@/lib/api";
import { makeClientId, mergeMessages, type ChatMember, type ChatMessage, type ChatPage, type ChatThreadView } from "@/lib/chat";

type Options = {
  /** "self" for the member's own conversation, or the member id the house is talking to. */
  conversation: string | null;
  /** True while the thread is on screen; marks incoming messages as read. */
  active: boolean;
};

function endpoints(conversation: string) {
  if (conversation === "self") {
    return { history: "/api/chat/messages", send: "/api/chat/messages", read: "/api/chat/read", house: false };
  }
  const base = `/api/admin/chat/conversations/${conversation}`;
  return { history: base, send: `${base}/messages`, read: `${base}/read`, house: true };
}

export function useChatThread({ conversation, active }: Options) {
  const chat = useChat();
  const client = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [member, setMember] = useState<ChatMember | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(conversation);
  current.current = conversation;
  const activeRef = useRef(active);
  activeRef.current = active;
  const readTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRead = useRef<string | null>(null);

  const sendRead = useCallback(
    async (target: string) => {
      try {
        await api(endpoints(target).read, { method: "POST", quiet: true });
        client.invalidateQueries({ queryKey: ["chat", "unread"] });
        client.invalidateQueries({ queryKey: ["chat", "conversations"] });
      } catch {
        // the next message or visit retries
      }
    },
    [client],
  );

  const markRead = useCallback(() => {
    if (!conversation || !activeRef.current || document.visibilityState !== "visible") return;
    pendingRead.current = conversation;
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      const target = pendingRead.current;
      pendingRead.current = null;
      if (target) void sendRead(target);
    }, 250);
  }, [conversation, sendRead]);

  const load = useCallback(async () => {
    if (!conversation) return;
    const target = conversation;
    setLoading(true);
    setError(null);
    try {
      const page = await api<ChatPage | ChatThreadView>(endpoints(target).history, { quiet: true });
      if (current.current !== target) return;
      if ("member" in page) setMember(page.member);
      setMessages((previous) => mergeMessages(previous, page.messages));
      setHasMore((previous) => previous || page.hasMore);
      markRead();
    } catch (caught) {
      if (current.current === target) setError(caught instanceof ApiError ? caught.code : "ERROR");
    } finally {
      if (current.current === target) setLoading(false);
    }
  }, [conversation, markRead]);

  const loadOlder = useCallback(async () => {
    if (!conversation || loadingOlder) return;
    const oldest = messages.find((message) => !message.state);
    if (!oldest) return;
    const target = conversation;
    setLoadingOlder(true);
    try {
      const url = `${endpoints(target).history}?before=${encodeURIComponent(oldest.createdAt)}`;
      const page = await api<ChatPage | ChatThreadView>(url, { quiet: true });
      if (current.current !== target) return;
      setMessages((previous) => mergeMessages(previous, page.messages));
      setHasMore(page.hasMore);
    } catch {
      // keep what is on screen; the button stays available
    } finally {
      if (current.current === target) setLoadingOlder(false);
    }
  }, [conversation, loadingOlder, messages]);

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    setMessages([]);
    setMember(null);
    setHasMore(false);
    setError(null);
    if (conversation) void loadRef.current();
  }, [conversation]);

  useEffect(() => {
    if (!conversation) return;
    return chat.subscribe((event) => {
      if (event.type === "connected") {
        void load();
        return;
      }
      if (event.type === "presence" && conversation !== "self" && event.memberId === conversation) {
        setMember((value) => (value ? { ...value, online: event.online } : value));
        return;
      }
      if (event.type === "cleared") {
        if (conversation === "self" || event.memberId === conversation) {
          pendingRead.current = null;
          setMessages((previous) => previous.filter((message) => message.state));
          setHasMore(false);
        }
        return;
      }
      if (event.type !== "message") return;
      if (conversation !== "self" && event.memberId !== conversation) return;
      setMessages((previous) => mergeMessages(previous, [event.message]));
      const fromOtherSide = conversation === "self" ? event.message.fromHouse : !event.message.fromHouse;
      if (fromOtherSide) markRead();
    });
  }, [chat, conversation, load, markRead]);

  useEffect(() => {
    if (!active || !conversation) return;
    markRead();
    const onVisible = () => document.visibilityState === "visible" && markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active, conversation, markRead]);

  // Leaving the thread (closing the panel or switching conversations) must not drop a read that was already due.
  useEffect(
    () => () => {
      clearTimeout(readTimer.current);
      const target = pendingRead.current;
      pendingRead.current = null;
      if (target) void sendRead(target);
    },
    [conversation, sendRead],
  );

  const deliver = useCallback(
    async (body: string, clientId: string) => {
      if (!conversation) return;
      const target = conversation;
      try {
        const saved = await api<ChatMessage>(endpoints(target).send, { body: { body, clientId }, quiet: true });
        if (current.current === target) setMessages((previous) => mergeMessages(previous, [saved]));
      } catch (caught) {
        const code = caught instanceof ApiError ? caught.code : "ERROR";
        if (current.current === target) {
          setMessages((previous) =>
            previous.map((message) => (message.clientId === clientId && message.state ? { ...message, state: "failed", error: code } : message)),
          );
        }
      }
    },
    [conversation],
  );

  const send = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body || !conversation) return;
      const clientId = makeClientId();
      const optimistic: ChatMessage = {
        id: `local-${clientId}`,
        body,
        fromHouse: endpoints(conversation).house,
        senderName: null,
        createdAt: new Date().toISOString(),
        clientId,
        state: "sending",
      };
      setMessages((previous) => [...previous, optimistic]);
      void deliver(body, clientId);
    },
    [conversation, deliver],
  );

  const retry = useCallback(
    (failed: ChatMessage) => {
      if (!failed.clientId) return;
      setMessages((previous) => previous.map((message) => (message.clientId === failed.clientId ? { ...message, state: "sending", error: undefined } : message)));
      void deliver(failed.body, failed.clientId);
    },
    [deliver],
  );

  const discard = useCallback((failed: ChatMessage) => {
    setMessages((previous) => previous.filter((message) => message.clientId !== failed.clientId || !message.state));
  }, []);

  return { messages, member, hasMore, loading, loadingOlder, error, loadOlder, send, retry, discard, reload: load };
}
