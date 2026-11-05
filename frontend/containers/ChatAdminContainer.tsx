import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChatsCircle, MagnifyingGlass, Trash, UserCircle } from "@phosphor-icons/react";
import { AdminShell } from "@/components/AdminShell";
import { useChat } from "@/components/ChatProvider";
import { ChatThread } from "@/components/ChatThread";
import { LoadingBlock } from "@/components/ui";
import { useChatThread } from "@/hooks/useChatThread";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { dayLabel, initials, timeLabel, type ChatConversation, type ChatMember } from "@/lib/chat";
import { useI18n } from "@/lib/i18n";

export function ChatAdminContainer() {
  const session = useGuard(true);
  const { t } = useI18n();
  const router = useRouter();
  const chat = useChat();
  const selected = typeof router.query.member === "string" ? router.query.member : null;
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const client = useQueryClient();
  const isAdmin = session.user?.role === "ADMIN";

  const conversations = useQuery({
    queryKey: ["chat", "conversations"],
    enabled: isAdmin,
    queryFn: () => api<ChatConversation[]>("/api/admin/chat/conversations", { quiet: true }),
  });

  const thread = useChatThread({ conversation: isAdmin ? selected : null, active: Boolean(selected) });

  const { setViewing } = chat;
  useEffect(() => {
    setViewing(selected);
    return () => setViewing(null);
  }, [selected, setViewing]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = conversations.data ?? [];
    if (!term) return list;
    return list.filter(({ member }) => `${member.firstName} ${member.lastName} ${member.memberCode}`.toLowerCase().includes(term));
  }, [conversations.data, search]);

  function open(memberId: string | null) {
    const query = memberId ? { member: memberId } : {};
    void router.replace({ pathname: "/admin/chat", query }, undefined, { shallow: true });
  }

  async function remove(memberId: string) {
    if (!window.confirm(t("chat.confirmDelete"))) return;
    setDeleting(true);
    try {
      await api(`/api/admin/chat/conversations/${memberId}`, { method: "DELETE", success: "chat.deleted" });
      await client.invalidateQueries({ queryKey: ["chat"] });
      open(null);
    } catch {
      // the error toast already explains it
    } finally {
      setDeleting(false);
    }
  }

  if (!session.user || !isAdmin) return <LoadingBlock label={t("common.loading")} />;

  const member: ChatMember | null = thread.member ?? conversations.data?.find((item) => item.member.id === selected)?.member ?? null;

  return (
    <AdminShell user={session.user} title={t("admin.chat")} fill>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-charcoal md:rounded-[2rem] md:border md:border-hairline">
        <aside className={`${selected ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-hairline md:w-80 md:border-r lg:w-96`} data-testid="chat-list">
          <div className="border-b border-hairline p-3 sm:p-4">
            <label className="relative block">
              <span className="sr-only">{t("chat.search")}</span>
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zincMuted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("chat.search")}
                className="min-h-11 w-full rounded-2xl border border-hairline bg-graphite py-2.5 pl-10 pr-4 text-base text-white outline-none placeholder:text-zincMuted/60 focus:border-champagne/50 sm:text-sm"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.isPending ? (
              <p className="p-6 text-center text-xs uppercase tracking-widest text-zincMuted">{t("common.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center text-sm leading-relaxed text-zincMuted">
                <ChatsCircle size={36} className="text-hairline" />
                {search ? t("chat.noResults") : t("chat.emptyHouse")}
              </div>
            ) : (
              <ul>
                {filtered.map((item) => (
                  <li key={item.member.id}>
                    <ConversationRow item={item} active={item.member.id === selected} onOpen={() => open(item.member.id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <section className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`} data-testid="chat-conversation">
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b border-hairline px-3 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => open(null)}
                  aria-label={t("chat.back")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-zincBright md:hidden"
                >
                  <ArrowLeft size={18} />
                </button>
                {member ? (
                  <>
                    <Avatar member={member} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zincBright" data-testid="chat-member-name">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="truncate text-[11px] text-zincMuted" data-testid="member-status" data-online={member.online}>
                        {member.memberCode} · {member.online ? <span className="text-emerald">{t("chat.online")}</span> : t("chat.offline")}
                      </p>
                    </div>
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-hairline px-3 text-[10px] font-bold uppercase tracking-widest text-zincMuted transition hover:border-champagne hover:text-champagne"
                      aria-label={t("chat.profile")}
                    >
                      <UserCircle size={18} />
                      <span className="hidden lg:inline">{t("chat.profile")}</span>
                    </Link>
                    {thread.messages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void remove(member.id)}
                        disabled={deleting}
                        aria-label={t("chat.delete")}
                        title={t("chat.delete")}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-zincMuted transition hover:border-rose hover:text-rose disabled:opacity-50"
                      >
                        <Trash size={18} />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="min-w-0 flex-1" />
                )}
              </header>
              {thread.error === "NOT_FOUND" || thread.error === "VALIDATION" ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zincMuted">{t("chat.notFound")}</div>
              ) : (
                <ChatThread
                  messages={thread.messages}
                  perspective="house"
                  hasMore={thread.hasMore}
                  loading={thread.loading}
                  loadingOlder={thread.loadingOlder}
                  onLoadOlder={thread.loadOlder}
                  onSend={thread.send}
                  onRetry={thread.retry}
                  onDiscard={thread.discard}
                  autoFocus
                  disabledReason={member && !member.active ? t("chat.memberInactive") : null}
                  empty={t("chat.emptyThread")}
                />
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zincMuted">
              <ChatsCircle size={44} className="text-hairline" />
              {t("chat.pick")}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function Avatar({ member }: { member: ChatMember }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-graphite text-xs font-bold text-champagne">
      {initials(member.firstName, member.lastName)}
      <span
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-charcoal ${member.online ? "bg-emerald" : "bg-zincMuted/60"}`}
        aria-hidden="true"
      />
    </span>
  );
}

function ConversationRow({ item, active, onOpen }: { item: ChatConversation; active: boolean; onOpen: () => void }) {
  const { t, locale } = useI18n();
  const last = item.lastMessage;
  const when = last ? dayLabel(last.createdAt, locale) : null;
  const stamp = !last ? "" : when === "today" ? timeLabel(last.createdAt, locale) : when === "yesterday" ? t("chat.yesterday") : when;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="conversation-row"
      data-member={item.member.id}
      className={`flex w-full items-center gap-3 border-b border-hairline/60 px-3 py-3 text-left transition-colors sm:px-4 ${active ? "bg-graphite" : "hover:bg-graphite/50"}`}
    >
      <Avatar member={item.member} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-sm ${item.unread > 0 ? "font-bold text-white" : "text-zincBright"}`}>
            {item.member.firstName} {item.member.lastName}
          </span>
          <span className={`shrink-0 text-[10px] ${item.unread > 0 ? "text-champagne" : "text-zincMuted"}`}>{stamp}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={`truncate text-xs ${item.unread > 0 ? "text-zincBright" : "text-zincMuted"}`}>
            {last ? `${last.fromHouse ? `${t("chat.you")}: ` : ""}${last.body.replace(/\s+/g, " ")}` : item.member.memberCode}
          </span>
          {item.unread > 0 ? (
            <span data-testid="row-unread" className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-champagne px-1.5 text-[10px] font-bold text-ink">
              {item.unread > 99 ? "99+" : item.unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
