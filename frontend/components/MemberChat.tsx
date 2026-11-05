import { useEffect, useState, type CSSProperties } from "react";
import { ChatCircleDots, X } from "@phosphor-icons/react";
import { useChat } from "@/components/ChatProvider";
import { ChatThread } from "@/components/ChatThread";
import { useChatThread } from "@/hooks/useChatThread";
import { useI18n } from "@/lib/i18n";

const MOBILE = "(max-width: 639px)";

/** Keeps the full-screen panel above the on-screen keyboard on phones (iOS does not resize fixed layers). */
function useViewportBox(enabled: boolean): CSSProperties | undefined {
  const [box, setBox] = useState<CSSProperties | undefined>(undefined);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      setBox(undefined);
      return;
    }
    const update = () => {
      if (!window.matchMedia(MOBILE).matches) {
        setBox(undefined);
        return;
      }
      setBox({ height: `${viewport.height}px`, top: `${viewport.offsetTop}px`, bottom: "auto" });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);
  return box;
}

export function MemberChat() {
  const { t } = useI18n();
  const chat = useChat();
  const [open, setOpen] = useState(false);
  const thread = useChatThread({ conversation: open ? "self" : null, active: open });
  const box = useViewportBox(open);

  const { setViewing } = chat;
  useEffect(() => {
    setViewing(open ? "self" : null);
    return () => setViewing(null);
  }, [setViewing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const lock = window.matchMedia(MOBILE).matches;
    const previous = document.body.style.overflow;
    if (lock) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (lock) document.body.style.overflow = previous;
    };
  }, [open]);

  const reconnecting = chat.status === "closed" || chat.status === "connecting";

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={chat.unread > 0 ? `${t("chat.open")} (${chat.unread})` : t("chat.open")}
          data-testid="chat-launcher"
          data-status={chat.status}
          className="gold-gradient fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-ink shadow-2xl shadow-black/60 transition hover:brightness-110 sm:bottom-6 sm:right-6"
        >
          <ChatCircleDots size={26} weight="fill" />
          {chat.unread > 0 ? (
            <span data-testid="chat-unread" className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-ink bg-rose px-1.5 text-[11px] font-bold text-white">
              {chat.unread > 99 ? "99+" : chat.unread}
            </span>
          ) : null}
        </button>
      ) : null}
      {open ? (
        <section
          role="dialog"
          aria-label={t("chat.title")}
          data-testid="chat-panel"
          style={box}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-charcoal sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-[2rem] sm:border sm:border-hairline sm:shadow-2xl sm:shadow-black/70"
        >
          <header className="flex items-center gap-3 border-b border-hairline px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-champagne/40 bg-graphite font-serif text-lg italic text-champagne">P</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-lg italic leading-tight">{t("chat.title")}</p>
              <p className="flex items-center gap-1.5 truncate text-[11px] text-zincMuted" data-testid="house-status" data-online={chat.houseOnline}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${reconnecting ? "bg-zincMuted" : chat.houseOnline ? "bg-emerald" : "bg-zincMuted/60"}`} />
                {reconnecting ? t("chat.reconnecting") : chat.houseOnline ? t("chat.houseOnline") : t("chat.houseOffline")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-zincBright transition hover:border-champagne hover:text-champagne"
            >
              <X size={18} />
            </button>
          </header>
          <ChatThread
            messages={thread.messages}
            perspective="member"
            hasMore={thread.hasMore}
            loading={thread.loading}
            loadingOlder={thread.loadingOlder}
            onLoadOlder={thread.loadOlder}
            onSend={thread.send}
            onRetry={thread.retry}
            onDiscard={thread.discard}
            autoFocus
            empty={
              <span>
                <span className="mb-2 block font-serif text-xl italic text-zincBright">{t("chat.emptyTitle")}</span>
                {t("chat.emptyMember")}
              </span>
            }
          />
        </section>
      ) : null}
    </>
  );
}
