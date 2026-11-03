import { useState } from "react";
import { Layout, List, SquaresFour } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Footer } from "@/components/ui";
import { MemberChrome } from "@/components/MemberChrome";
import { ProfileCard } from "@/components/ProfileCard";
import { LoadingBlock } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Card } from "@/lib/types";

type View = "large" | "grid" | "list";

export function CatalogContainer() {
  const session = useGuard(false);
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const [view, setView] = useState<View>("large");
  const catalog = useQuery({
    queryKey: ["profiles", locale],
    enabled: Boolean(session.user),
    queryFn: () => api<Card[]>(`/api/profiles?locale=${locale}`),
  });
  const favorite = useMutation({
    mutationFn: (id: string) => api(`/api/profiles/${id}/favorite`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profiles"] }),
  });

  if (!session.user) {
    return <LoadingBlock label={t("common.loading")} />;
  }

  return (
    <MemberChrome user={session.user}>
      <main className="mx-auto max-w-[1600px] p-4 md:p-8 lg:p-12">
        <section className="mb-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-6 font-serif text-4xl italic leading-tight sm:text-5xl lg:text-7xl">
                {t("catalog.line")}
                <br />
                <span className="font-bold not-italic text-champagne">{t("catalog.emphasis")}</span>
              </h2>
              <p className="text-base leading-relaxed text-zincMuted md:text-lg">{t("catalog.lead")}</p>
            </div>
          </div>
        </section>
        <div className="mb-8 flex flex-col gap-4 border-b border-hairline/40 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.2em] text-zincMuted">{t("catalog.view")}</span>
            <div className="flex rounded-lg border border-hairline bg-graphite p-1">
              <ViewButton active={view === "large"} onClick={() => setView("large")} label="Large">
                <Layout weight="fill" />
              </ViewButton>
              <ViewButton active={view === "grid"} onClick={() => setView("grid")} label="Grid">
                <SquaresFour />
              </ViewButton>
              <ViewButton active={view === "list"} onClick={() => setView("list")} label="List">
                <List />
              </ViewButton>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-zincMuted">
            {t("catalog.sorted")}: <span className="ml-2 text-zincBright">{t("catalog.recent")}</span>
          </p>
        </div>
        {catalog.isLoading ? <LoadingBlock label={t("common.loading")} /> : null}
        {catalog.isError ? <p className="text-sm text-rose">{t("common.error")}</p> : null}
        {catalog.data && catalog.data.length === 0 ? <p className="text-sm text-zincMuted">{t("catalog.empty")}</p> : null}
        <div className={view === "large" ? "grid grid-cols-1 gap-10 md:grid-cols-2" : view === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-4"}>
          {catalog.data?.map((card) => (
            <ProfileCard key={card.id} card={card} view={view} onFavorite={(id) => favorite.mutate(id)} />
          ))}
        </div>
      </main>
      <Footer />
    </MemberChrome>
  );
}

function ViewButton({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`flex h-11 w-11 items-center justify-center rounded-lg ${active ? "border border-hairline bg-charcoal text-champagne" : "text-zincMuted"}`}>
      {children}
    </button>
  );
}
