import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  ChartLineUp,
  Gear,
  IdentificationCard,
  LinkSimple,
  List,
  ShieldCheck,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LanguageButton, Wordmark } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SessionUser } from "@/lib/types";

const links = [
  { href: "/admin", key: "admin.overview", icon: ChartLineUp },
  { href: "/admin/members", key: "admin.members", icon: UsersThree },
  { href: "/admin/profiles", key: "admin.profiles", icon: IdentificationCard },
  { href: "/admin/links", key: "admin.links", icon: LinkSimple },
  { href: "/admin/activity", key: "admin.activity", icon: ShieldCheck },
  { href: "/admin/settings", key: "admin.settings", icon: Gear },
];

export function AdminShell({ user, title, children }: { user: SessionUser; title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<{ status: string }>("/api/health"),
    retry: false,
  });

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    await client.invalidateQueries({ queryKey: ["me"] });
    router.push("/");
  }

  const nav = (
    <nav className="space-y-2 p-4">
      {links.map((item) => {
        const active = router.pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
              active ? "border border-hairline bg-graphite text-champagne" : "text-zincMuted hover:bg-graphite/40 hover:text-white"
            }`}
          >
            <Icon className="text-lg" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink text-zincBright md:flex">
      <aside className="hidden h-screen w-[280px] shrink-0 flex-col border-r border-hairline bg-charcoal md:flex">
        <div className="border-b border-hairline/60 p-8">
          <Link href="/catalog">
            <Wordmark compact />
          </Link>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-zincMuted">{t("admin.suite")}</p>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-hairline/60 p-6">
          <p className="text-xs font-bold">{user.firstName}</p>
          <p className="text-[10px] text-zincMuted">{t("admin.super")}</p>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-hairline/60 bg-charcoal/30 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
              <List />
            </button>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.35em] text-zincMuted md:text-xs md:tracking-[0.4em]">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <LanguageButton />
            <div className="hidden items-center gap-2 rounded-full border border-hairline px-4 py-2 text-xs text-zincMuted sm:flex">
              <span className={`h-2 w-2 rounded-full ${health.isSuccess ? "animate-pulse bg-emerald" : "bg-rose"}`} />
              {health.isSuccess ? t("admin.healthy") : t("admin.offline")}
            </div>
            <button type="button" onClick={signOut} className="text-xs font-bold uppercase tracking-widest text-rose">
              <SignOut className="md:hidden" />
              <span className="hidden md:inline">{t("admin.signOut")}</span>
            </button>
          </div>
        </header>
        {open ? <div className="border-b border-hairline bg-charcoal md:hidden">{nav}</div> : null}
        <div className="flex-1 overflow-y-auto bg-ink p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
