import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { LoadingBlock, QuietButton, StatusPill } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Card } from "@/lib/types";

export function ProfilesAdminContainer() {
  const session = useGuard(true);
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const profiles = useQuery({
    queryKey: ["admin-profiles", locale],
    enabled: session.user?.role === "ADMIN",
    queryFn: () => api<Card[]>(`/api/admin/profiles?locale=${locale}`),
  });
  const visibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      api(`/api/admin/profiles/${id}/visibility?visible=${visible}`, { method: "PATCH", success: visible ? "feedback.shown" : "feedback.hidden" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-profiles"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/profiles/${id}`, { method: "DELETE", success: "feedback.profileRemoved" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-profiles"] }),
  });

  if (!session.user || session.user.role !== "ADMIN") return <LoadingBlock label={t("common.loading")} />;

  return (
    <AdminShell user={session.user} title={t("profiles.title")}>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h3 className="font-serif text-3xl italic sm:text-4xl">{t("profiles.title")}</h3>
          <p className="mt-3 max-w-xl text-sm text-zincMuted">{t("profiles.lead")}</p>
        </div>
        <Link href="/admin/profiles/new" className="gold-gradient block min-h-12 rounded-2xl px-6 py-4 text-center text-xs font-bold uppercase tracking-widest text-ink sm:inline-block">
          {t("profiles.new")}
        </Link>
      </div>
      {profiles.isLoading ? <LoadingBlock label={t("common.loading")} /> : null}
      {profiles.data && profiles.data.length === 0 ? <p className="text-sm text-zincMuted">{t("profiles.empty")}</p> : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {profiles.data?.map((card) => (
          <article key={card.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-hairline bg-charcoal p-4 sm:flex-row sm:rounded-[2rem]">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:w-28 sm:shrink-0 sm:grid-cols-none sm:flex-col">
              {card.photos.slice(0, 3).map((photo) => (
                <img key={photo.id} src={photo.url} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover sm:h-20 sm:w-full" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="break-words font-serif text-2xl italic sm:text-3xl">{card.name}</h4>
                  <p className="text-xs text-zincMuted">{card.age} · {card.city}</p>
                </div>
                <StatusPill tone={card.visible ? "green" : "rose"}>{card.visible ? t("profiles.listed") : t("profiles.hidden")}</StatusPill>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/admin/profiles/${card.id}`} className="inline-flex min-h-11 items-center rounded-2xl border border-hairline px-4 py-2 text-[10px] font-bold uppercase tracking-widest">
                  {t("profiles.edit")}
                </Link>
                <QuietButton type="button" onClick={() => visibility.mutate({ id: card.id, visible: !card.visible })}>
                  {card.visible ? t("profiles.hide") : t("profiles.show")}
                </QuietButton>
                <QuietButton
                  type="button"
                  onClick={() => {
                    if (window.confirm(t("profiles.confirm"))) remove.mutate(card.id);
                  }}
                >
                  {t("profiles.remove")}
                </QuietButton>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
