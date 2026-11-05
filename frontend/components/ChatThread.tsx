import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowClockwise, ArrowDown, CircleNotch, PaperPlaneRight, Trash, WarningCircle } from "@phosphor-icons/react";
import { CHAT_MAX, dayKey, dayLabel, timeLabel, type ChatMessage } from "@/lib/chat";
import { errorKey, useI18n } from "@/lib/i18n";

const NEAR_BOTTOM_PX = 120;

export function ChatThread({
  messages,
  perspective,
  hasMore,
  loading,
  loadingOlder,
  onLoadOlder,
  onSend,
  onRetry,
  onDiscard,
  empty,
  disabledReason,
  autoFocus = false,
}: {
  messages: ChatMessage[];
  perspective: "member" | "house";
  hasMore: boolean;
  loading: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onSend: (body: string) => void;
  onRetry: (message: ChatMessage) => void;
  onDiscard: (message: ChatMessage) => void;
  empty: ReactNode;
  disabledReason?: string | null;
  autoFocus?: boolean;
}) {
  const { t, locale } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const previousHeight = useRef<number | null>(null);
  const lastCount = useRef(0);
  const [unseen, setUnseen] = useState(0);

  const own = (message: ChatMessage) => (perspective === "house" ? message.fromHouse : !message.fromHouse);

  function scrollToBottom(smooth = false) {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    atBottom.current = true;
    setUnseen(0);
  }

  function onScroll() {
    const box = scroller.current;
    if (!box) return;
    atBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM_PX;
    if (atBottom.current) setUnseen(0);
  }

  function loadOlder() {
    const box = scroller.current;
    previousHeight.current = box ? box.scrollHeight - box.scrollTop : null;
    onLoadOlder();
  }

  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const added = messages.length - lastCount.current;
    const wasEmpty = lastCount.current === 0;
    lastCount.current = messages.length;
    if (previousHeight.current !== null && !loadingOlder) {
      box.scrollTop = box.scrollHeight - previousHeight.current;
      previousHeight.current = null;
      return;
    }
    if (added <= 0) return;
    const newest = messages[messages.length - 1];
    if (wasEmpty || atBottom.current || (newest && own(newest) && newest.state === "sending")) {
      scrollToBottom(!wasEmpty);
    } else {
      setUnseen((value) => value + added);
    }
  }, [messages, loadingOlder, perspective]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
          data-testid="chat-scroller"
          aria-live="polite"
        >
          {hasMore ? (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={loadOlder}
                disabled={loadingOlder}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline px-4 text-[10px] font-bold uppercase tracking-widest text-zincMuted transition hover:border-champagne hover:text-champagne disabled:opacity-50"
              >
                {loadingOlder ? <CircleNotch size={12} className="animate-spin" /> : null}
                {t("chat.older")}
              </button>
            </div>
          ) : null}
          {loading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zincMuted">
              <CircleNotch size={22} className="animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-relaxed text-zincMuted">{empty}</div>
          ) : (
            <ol className="space-y-1.5">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
                const mine = own(message);
                const grouped = !newDay && previous && own(previous) === mine && previous.fromHouse === message.fromHouse;
                const label = dayLabel(message.createdAt, locale);
                return (
                  <Fragment key={message.clientId && message.state ? message.clientId : message.id}>
                    {newDay ? (
                      <li className="flex justify-center py-3" aria-hidden="true">
                        <span className="rounded-full bg-graphite px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zincMuted">
                          {label === "today" ? t("chat.today") : label === "yesterday" ? t("chat.yesterday") : label}
                        </span>
                      </li>
                    ) : null}
                    <li className={`flex flex-col ${mine ? "items-end" : "items-start"} ${grouped ? "" : "pt-2"}`} data-testid="chat-message" data-own={mine}>
                      {!grouped && perspective === "house" && message.fromHouse && message.senderName ? (
                        <span className="mb-1 px-1 text-[10px] uppercase tracking-widest text-zincMuted">{message.senderName}</span>
                      ) : null}
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug sm:max-w-[75%] [overflow-wrap:anywhere] ${
                          mine ? "rounded-br-md bg-champagne text-ink" : "rounded-bl-md border border-hairline bg-graphite text-zincBright"
                        } ${message.state === "sending" ? "opacity-70" : ""} ${message.state === "failed" ? "ring-1 ring-rose" : ""}`}
                      >
                        {message.body}
                      </div>
                      {message.state === "failed" ? (
                        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-1 text-[11px] text-rose">
                          <span className="inline-flex items-center gap-1">
                            <WarningCircle size={12} /> {t(chatErrorKey(message.error))}
                          </span>
                          <button type="button" onClick={() => onRetry(message)} className="inline-flex min-h-7 items-center gap-1 font-bold underline-offset-2 hover:underline">
                            <ArrowClockwise size={12} /> {t("chat.retry")}
                          </button>
                          <button type="button" onClick={() => onDiscard(message)} className="inline-flex min-h-7 items-center gap-1 text-zincMuted hover:text-zincBright" aria-label={t("chat.discard")}>
                            <Trash size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="mt-0.5 px-1 text-[10px] text-zincMuted">
                          {message.state === "sending" ? t("chat.sending") : timeLabel(message.createdAt, locale)}
                        </span>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          )}
        </div>
        {unseen > 0 ? (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-champagne px-4 py-2 text-[11px] font-bold text-ink shadow-xl"
          >
            <ArrowDown size={12} weight="bold" /> {t("chat.newBelow")}
          </button>
        ) : null}
      </div>
      <Composer onSend={onSend} disabledReason={disabledReason} autoFocus={autoFocus} />
    </div>
  );
}

function chatErrorKey(code?: string) {
  if (code === "CHAT_RATE") return "chat.errorRate";
  if (code === "CHAT_TOO_LONG") return "chat.errorLong";
  if (code === "CHAT_MEMBER_INACTIVE") return "chat.memberInactive";
  if (code === "UNAUTHENTICATED") return "chat.errorSession";
  const key = errorKey(code);
  return key === "errors.generic" ? "chat.errorSend" : key;
}

function Composer({ onSend, disabledReason, autoFocus }: { onSend: (body: string) => void; disabledReason?: string | null; autoFocus: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const disabled = Boolean(disabledReason);

  useEffect(() => {
    const box = field.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 128)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus && !disabled && window.matchMedia("(pointer: fine)").matches) field.current?.focus();
  }, [autoFocus, disabled]);

  function submit() {
    const body = text.trim();
    if (!body || disabled || body.length > CHAT_MAX) return;
    onSend(body);
    setText("");
    field.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    event.preventDefault();
    submit();
  }

  const remaining = CHAT_MAX - text.length;

  return (
    <div className="border-t border-hairline bg-charcoal px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
      {disabledReason ? (
        <p className="py-2 text-center text-xs text-zincMuted">{disabledReason}</p>
      ) : (
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="sr-only" htmlFor="chat-composer">
            {t("chat.placeholder")}
          </label>
          <textarea
            id="chat-composer"
            ref={field}
            rows={1}
            value={text}
            maxLength={CHAT_MAX}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("chat.placeholder")}
            enterKeyHint="send"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-hairline bg-graphite px-4 py-2.5 text-base leading-snug text-white outline-none transition-colors placeholder:text-zincMuted/60 focus:border-champagne/50"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label={t("chat.send")}
            title={t("chat.send")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-champagne text-ink transition hover:brightness-110 disabled:opacity-40"
          >
            <PaperPlaneRight size={18} weight="fill" />
          </button>
        </form>
      )}
      {!disabledReason && remaining < 200 ? (
        <p className={`mt-1 text-right text-[10px] ${remaining < 0 ? "text-rose" : "text-zincMuted"}`}>{remaining}</p>
      ) : null}
    </div>
  );
}
