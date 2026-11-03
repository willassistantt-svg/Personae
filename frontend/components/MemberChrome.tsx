import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { Bell, MagnifyingGlass, SignOut, List } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageButton, Wordmark } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SessionUser } from "@/lib/types";

export function MemberChrome({
  user,
  query,
  onQuery,
  children,
}: {
  user: SessionUser;
  query?: string;
  onQuery?: (value: string) => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    await client.invalidateQueries({ queryKey: ["me"] });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 flex h-20 items-center justify-between gap-4 border-b border-hairline/60 bg-ink/90 px-4 backdrop-blur-xl md:h-24 md:px-8">
        <div className="flex items-center gap-6 lg:gap-12">
          <Link href="/catalog" aria-label="Personae">
            <Wordmark compact />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex">
            <Link href="/catalog" className="text-xs font-medium uppercase tracking-[0.2em] text-champagne">
              {t("header.directory")}
            </Link>
            {user.role === "ADMIN" ? (
              <Link href="/admin" className="text-xs font-medium uppercase tracking-[0.2em] text-zincMuted transition-colors hover:text-zincBright">
                {t("header.house")}
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          {onQuery ? (
            <label className="hidden items-center gap-3 rounded-full border border-hairline bg-graphite px-4 py-2 md:flex">
              <MagnifyingGlass className="text-zincMuted" />
              <input
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder={t("catalog.search")}
                className="w-40 bg-transparent text-xs text-zincBright outline-none placeholder:text-zincMuted lg:w-52"
              />
            </label>
          ) : null}
          <LanguageButton />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-hairline transition-colors hover:border-champagne"
            aria-label={t("header.notices")}
          >
            <Bell />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-champagne" />
          </button>
          <button type="button" onClick={() => setMenu((value) => !value)} className="flex items-center gap-3 border-l border-hairline pl-3 md:pl-5">
            <span className="hidden text-right sm:block">
              <span className="block text-[10px] font-bold uppercase tracking-wider">{user.firstName}</span>
              <span className="block text-[9px] text-zincMuted">{user.memberCode}</span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-graphite font-serif text-champagne">
              {user.firstName.slice(0, 1)}
            </span>
          </button>
          <button type="button" className="lg:hidden" onClick={() => setMenu((value) => !value)} aria-label="Menu">
            <List />
          </button>
        </div>
      </header>
      {open ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 md:px-8">
          <div className="rounded-3xl border border-hairline bg-charcoal p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-champagne">{t("header.notices")}</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zincMuted">{t("header.noticeBody")}</p>
          </div>
        </div>
      ) : null}
      {menu ? (
        <div className="mx-auto flex max-w-[1600px] justify-end px-4 pt-3 md:px-8">
          <div className="w-56 rounded-3xl border border-hairline bg-charcoal p-3">
            <Link href="/catalog" className="block rounded-2xl px-4 py-3 text-sm text-zincBright lg:hidden">
              {t("header.directory")}
            </Link>
            {user.role === "ADMIN" ? (
              <Link href="/admin" className="block rounded-2xl px-4 py-3 text-sm text-zincBright lg:hidden">
                {t("header.house")}
              </Link>
            ) : null}
            <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm text-rose">
              <SignOut /> {t("header.signOut")}
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
